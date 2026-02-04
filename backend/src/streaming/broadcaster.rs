use crate::state::{AudioFrame, StationData, StreamMessage, StationEvent, CurrentSong};
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::Duration;
use chrono::Utc;
use tokio::sync::{broadcast, mpsc, RwLock};
use crate::config::BURST_BUFFER_SECONDS;

pub async fn start(
    tx: broadcast::Sender<AudioFrame>,
    event_tx: broadcast::Sender<StationEvent>,
    mut rx: mpsc::Receiver<StreamMessage>,
    history: Arc<RwLock<VecDeque<AudioFrame>>>,
    station: Arc<RwLock<StationData>>,
) {
    let mut next_send_time = tokio::time::Instant::now();

    loop {
        let msg = match rx.recv().await {
            Some(m) => m,
            None => break,
        };

        let frame = match msg {
            StreamMessage::SongStart(song, duration_ms, raw_rhythm) => {
                let rhythm_data = raw_rhythm.map(|data| {
                    use base64::{Engine as _, engine::general_purpose};
                    general_purpose::STANDARD.encode(data)
                });

                let mut current_song = CurrentSong {
                    id: song.id,
                    title: song.title,
                    artist_names: song.artist_names,
                    album_title: song.album_title,
                    duration_ms,
                    started_at: Utc::now(),
                    started_at_ms: 0, // Will be set below
                    rhythm_data,
                };

                {
                    let mut station_guard = station.write().await;
                    current_song.started_at_ms = station_guard.playback_position.total_duration_ms;
                    station_guard.current_song = Some(current_song.clone());
                }

                let _ = event_tx.send(StationEvent::SongChange(current_song));
                continue;
            }
            StreamMessage::Frame(f) => f,
        };

        // Send to live listeners
        let _ = tx.send(frame.clone());

        // Update server playback position
        {
            let mut station_guard = station.write().await;
            station_guard.playback_position.current_frame_index += 1;
            station_guard.playback_position.total_duration_ms += frame.duration.as_millis() as u64;
        }

        // Add to history buffer for new joiners
        {
            let mut history_guard = history.write().await;
            history_guard.push_back(frame.clone());

            // Trim buffer to target duration
            let mut total_duration = Duration::ZERO;
            for f in history_guard.iter().rev() {
                total_duration += f.duration;
                if total_duration.as_secs_f64() > BURST_BUFFER_SECONDS {
                    break;
                }
            }

            // Remove old frames
            while history_guard.len() > 0 {
                if let Some(_oldest) = history_guard.front() {
                    let remaining_duration: Duration = history_guard.iter()
                        .skip(1)
                        .map(|f| f.duration)
                        .sum();

                    if remaining_duration.as_secs_f64() >= BURST_BUFFER_SECONDS {
                        history_guard.pop_front();
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        // Precise timing: sleep until it's time to send the next frame
        next_send_time += frame.duration;
        let now = tokio::time::Instant::now();

        if next_send_time > now {
            tokio::time::sleep_until(next_send_time).await;
        } else {
            // We're behind schedule, log it but don't sleep
            let behind = now.duration_since(next_send_time);
            if behind > Duration::from_millis(100) {
                tracing::warn!("Broadcaster is {}ms behind schedule", behind.as_millis());
            }
            next_send_time = now;
        }
    }
}