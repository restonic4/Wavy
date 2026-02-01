use crate::config::BURST_BUFFER_SECONDS;
use crate::state::{AppState, AudioFrame, Listener};
use axum::{
    body::Body,
    extract::State,
    http::{header, StatusCode},
    response::{IntoResponse, Json, Response},
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;

// --- API ---

#[derive(Deserialize)]
pub struct Heartbeat {
    connect_time: DateTime<Utc>,
    played_seconds: f64,
}

pub async fn heartbeat(
    State(state): State<AppState>,
    jar: axum_extra::extract::cookie::PrivateCookieJar,
    Json(payload): Json<Heartbeat>,
) -> impl IntoResponse {
    let mut station = state.station.write().await;

    // Calculate where the user *should* be in the timeline
    // The user's buffer contains BURST_BUFFER_SECONDS of audio, so they're behind by that much
    let user_audio_time = payload.connect_time
        + chrono::Duration::milliseconds((payload.played_seconds * 1000.0) as i64)
        - chrono::Duration::milliseconds((BURST_BUFFER_SECONDS * 1000.0) as i64);

    let now = Utc::now();

    // Calculate drift (positive = user is behind, negative = user is ahead)
    let drift_ms = now.signed_duration_since(user_audio_time).num_milliseconds();
    let drift_seconds = drift_ms as f64 / 1000.0;

    // Find which song the user is listening to
    let mut current_song_id = 0;
    for song in station.history.iter().rev() {
        if song.started_at <= user_audio_time {
            current_song_id = song.id;
            break;
        }
    }

    // Check if user is authenticated via cookie, or create/reuse anonymous session
    let (username, is_authenticated, jar) = {
        use crate::auth::AUTH_COOKIE_NAME;
        use axum_extra::extract::cookie::{Cookie, SameSite};
        use time::Duration;
        
        const ANON_COOKIE_NAME: &str = "anon_session";
        
        if let Some(cookie) = jar.get(AUTH_COOKIE_NAME) {
            // Authenticated user
            if let Ok(user_id) = cookie.value().parse::<i64>() {
                if let Ok(Some(user)) = crate::orm::users::repository::find_by_id(&state.db, user_id).await {
                    (user.username, true, jar)
                } else {
                    // Cookie exists but user not found - treat as anonymous
                    let anon_id = jar.get(ANON_COOKIE_NAME)
                        .map(|c| c.value().to_string())
                        .unwrap_or_else(|| format!("{}", rand::random::<u32>() % 10000));
                    
                    let mut cookie = Cookie::new(ANON_COOKIE_NAME, anon_id.clone());
                    cookie.set_http_only(true);
                    cookie.set_path("/");
                    cookie.set_same_site(SameSite::Lax);
                    cookie.set_max_age(Duration::days(30));
                    
                    (format!("Listener_{}", anon_id), false, jar.add(cookie))
                }
            } else {
                // Invalid auth cookie - treat as anonymous
                let anon_id = jar.get(ANON_COOKIE_NAME)
                    .map(|c| c.value().to_string())
                    .unwrap_or_else(|| format!("{}", rand::random::<u32>() % 10000));
                
                let mut cookie = Cookie::new(ANON_COOKIE_NAME, anon_id.clone());
                cookie.set_http_only(true);
                cookie.set_path("/");
                cookie.set_same_site(SameSite::Lax);
                cookie.set_max_age(Duration::days(30));
                
                (format!("Listener_{}", anon_id), false, jar.add(cookie))
            }
        } else {
            // No auth cookie - check for anonymous session cookie
            let anon_id = jar.get(ANON_COOKIE_NAME)
                .map(|c| c.value().to_string())
                .unwrap_or_else(|| format!("{}", rand::random::<u32>() % 10000));
            
            let mut cookie = Cookie::new(ANON_COOKIE_NAME, anon_id.clone());
            cookie.set_http_only(true);
            cookie.set_path("/");
            cookie.set_same_site(SameSite::Lax);
            cookie.set_max_age(Duration::days(30));
            
            (format!("Listener_{}", anon_id), false, jar.add(cookie))
        }
    };

    station.listeners.insert(
        username.clone(),
        Listener {
            username: username.clone(),
            current_song_id,
            drift_seconds,
            last_seen: now,
            is_authenticated,
        },
    );

    // Clean up stale listeners (haven't sent heartbeat in 10 seconds)
    station
        .listeners
        .retain(|_, v| (now - v.last_seen).num_seconds() < 10);

    (jar, StatusCode::OK)
}

pub async fn get_status(State(state): State<AppState>) -> impl IntoResponse {
    let station = state.station.read().await;

    Json(serde_json::json!({
        "history": station.history,
        "listeners": station.listeners.values().collect::<Vec<_>>(),
        "server_time": Utc::now(),
    }))
}

// --- STREAMING ---

pub async fn stream_audio(State(state): State<AppState>) -> Response {
    let rx = state.tx.subscribe();

    // Send burst buffer (catch-up frames for new joiners)
    let history_data: Vec<AudioFrame> = {
        let guard = state.buffer_history.read().await;
        guard.iter().cloned().collect()
    };

    tracing::info!("New listener connected, sending {} buffered frames", history_data.len());

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

    let combined_stream = burst_stream.chain(live_stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "audio/mpeg")
        .header(header::CACHE_CONTROL, "no-cache, no-store")
        .header("X-Content-Type-Options", "nosniff")
        .body(Body::from_stream(combined_stream))
        .unwrap()
}