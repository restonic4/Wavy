use crate::state::{AppState, AudioFrame, Listener, StationEvent, CurrentSong};
use axum::{
    body::Body,
    extract::{State, ws::{WebSocketUpgrade, WebSocket, Message, Utf8Bytes}},
    http::{header, StatusCode},
    response::{Json, Response},
};
use chrono::{Utc};
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use crate::auth::AuthUser;
use crate::streaming::model::{ActiveListenerDto, HeartbeatQuery, HeartbeatResponse};

pub async fn stream_audio(
    State(state): State<AppState>,
    user: AuthUser,
) -> Response {
    let rx = state.tx.subscribe();
    let user_id = user.0.id;
    let username = user.0.username.clone();

    // Send burst buffer (catch-up frames for new joiners)
    let (history_data, burst_buffer_ms): (Vec<AudioFrame>, u64) = {
        let guard = state.buffer_history.read().await;
        let frames: Vec<AudioFrame> = guard.iter().cloned().collect();
        let total_ms = frames.iter()
            .map(|f| f.duration.as_millis() as u64)
            .sum();
        (frames, total_ms)
    };

    tracing::info!(
        "User {} ({}) connected to stream, sending {} buffered frames ({} ms)",
        username,
        user_id,
        history_data.len(),
        burst_buffer_ms
    );

    // Track this listener
    {
        let mut station_guard = state.station.write().await;
        let current_frame_index = station_guard.playback_position.current_frame_index;
        let start_total_duration_ms = station_guard.playback_position.total_duration_ms;
        
        station_guard.listeners.insert(
            user_id,
            Listener {
                user_id,
                username: username.clone(),
                connected_at: Utc::now(),
                last_heartbeat: Utc::now(),
                start_frame_index: current_frame_index,
                burst_buffer_ms,
                start_total_duration_ms,
                last_saved_at: Utc::now(),
            },
        );
    }

    // Create stream from history
    let burst_stream = tokio_stream::iter(history_data.into_iter().map(|f| Ok(f.data)));

    // Create stream from live broadcast
    let live_stream = BroadcastStream::new(rx).map(|result| match result {
        Ok(frame) => Ok(frame.data),
        Err(e) => Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Broadcast lag: {}", e),
        )),
    });

    // Send audio stream
    let combined_stream = burst_stream.chain(live_stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "audio/mpeg")
        .header(header::CACHE_CONTROL, "no-cache, no-store")
        .header("X-Content-Type-Options", "nosniff")
        .body(Body::from_stream(combined_stream))
        .unwrap()
}

pub async fn heartbeat(
    State(state): State<AppState>,
    user: AuthUser,
    Json(query): Json<HeartbeatQuery>,
) -> Result<Json<HeartbeatResponse>, StatusCode> {
    let mut station_guard = state.station.write().await;
    let user_id = user.0.id;
    
    // Check if listener exists, if so update heartbeat
    if let Some(listener) = station_guard.listeners.get_mut(&user_id) {
        listener.last_heartbeat = Utc::now();
    } else {
        // If not found (maybe restarted server or cleaned up), we return 404
        // The client should probably reconnect
        return Err(StatusCode::NOT_FOUND);
    }
    
    let listener = station_guard.listeners.get(&user_id).unwrap();
    let server_now_ms = station_guard.playback_position.total_duration_ms;

    let client_base_pos = listener.start_total_duration_ms.saturating_sub(listener.burst_buffer_ms);

    // Calculate absolute client position in the server's global timeline
    // Client received history starting at (start_total_duration_ms - burst_buffer_ms)
    // Client has played client_position_ms since then.
    let desync_ms = if let Some(client_pos_ms) = query.client_position_ms {
        let client_abs_pos = client_base_pos + client_pos_ms;
        
        (server_now_ms as i64) - (client_abs_pos as i64)
    } else {
        0
    };

    Ok(Json(HeartbeatResponse {
        desync_ms,
        server_position_ms: server_now_ms,
        client_base_pos_ms: client_base_pos,
    }))
}

pub async fn get_active_listeners(
    State(state): State<AppState>,
    _user: AuthUser,
) -> Json<Vec<ActiveListenerDto>> {
    let station_guard = state.station.read().await;
    let now = Utc::now();
    
    let listeners = station_guard.listeners.values()
        .map(|l| {
            let listen_time_ms = now
                .signed_duration_since(l.connected_at)
                .num_milliseconds();
            
            ActiveListenerDto {
                username: l.username.clone(),
                connected_at: l.connected_at,
                listen_time_ms,
            }
        })
        .collect();
        
    Json(listeners)
}

pub async fn get_current_song(
    State(state): State<AppState>,
    _user: AuthUser,
) -> Json<Option<CurrentSong>> {
    let station_guard = state.station.read().await;
    Json(station_guard.current_song.clone())
}

pub async fn ws_handler(
    State(state): State<AppState>,
    _user: AuthUser,
    ws: WebSocketUpgrade,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    let mut rx = state.event_tx.subscribe();
    
    // Send current state first
    {
        let guard = state.station.read().await;
        if let Some(song) = &guard.current_song {
            let event = StationEvent::SongChange(song.clone());
            if let Ok(json) = serde_json::to_string(&event) {
                let msg = Message::Text(Utf8Bytes::from(json));
                if socket.send(msg).await.is_err() {
                    return;
                }
            }
        }
    }

    while let Ok(event) = rx.recv().await {
        if let Ok(json) = serde_json::to_string(&event) {
            let msg = Message::Text(Utf8Bytes::from(json));
            if socket.send(msg).await.is_err() {
                break;
            }
        }
    }
}