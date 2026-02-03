use crate::config::BURST_BUFFER_SECONDS;
use crate::state::AudioFrame;
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, mpsc, RwLock};

pub async fn start(
    tx: broadcast::Sender<AudioFrame>,
    mut rx: mpsc::Receiver<AudioFrame>,
    history: Arc<RwLock<VecDeque<AudioFrame>>>,
) {
    let mut next_send_time = tokio::time::Instant::now();

    loop {
        let frame = match rx.recv().await {
            Some(f) => f,
            None => break,
        };

        // Send to live listeners
        let _ = tx.send(frame.clone());

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