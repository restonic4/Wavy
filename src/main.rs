mod config;
mod state;
mod loader;
mod broadcaster;
mod handlers;

use axum::{
    body::Body,
    extract::State,
    http::{header, StatusCode},
    response::{Response},
    routing::get,
    Router,
};
use bytes::Bytes;
use std::{fs::File, io::Read, sync::Arc, time::Duration};
use tokio::sync::{broadcast, mpsc};
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use tower_http::services::ServeFile;
use std::collections::VecDeque;
use tokio::sync::RwLock;

const AUDIO_FILE_PATH: &str = "audio.mp3";

// Audio Quality: 128 kbps (standard quality).
const BITRATE_KBPS: u64 = 128;
const BYTES_PER_SECOND: usize = (BITRATE_KBPS * 1000 / 8) as usize;

// Packet Size: How much audio do we send in one network chunk?
// 0.25 seconds (250ms) is a good balance between latency and overhead.
// Too small = high CPU/Network overhead. Too big = high latency for joiners.
const CHUNK_DURATION_MS: u64 = 250;
const BYTES_PER_CHUNK: usize = BYTES_PER_SECOND / (1000 / CHUNK_DURATION_MS as usize);

// Buffer Safety: The "5 Seconds Ahead" Rule.
// The Pre-Buffer holds data read from disk before the broadcaster needs it.
// If the disk freezes for 4 seconds, the stream won't cut because we have 5 seconds buffered.
const DISK_BUFFER_SECONDS: u64 = 5;
const DISK_BUFFER_CAPACITY: usize = (DISK_BUFFER_SECONDS * 1000 / CHUNK_DURATION_MS) as usize;

// Client Lag Tolerance: How many chunks can a client lag behind before we drop them?
// If a client internet disconnects for 10 seconds, we can't keep their buffer forever.
const BROADCAST_CAPACITY: usize = DISK_BUFFER_CAPACITY * 2;

// How many chunks to send immediately on connect (Fast Start).
// 4 seconds is usually enough to satisfy browser buffers instantly.
const BURST_SECONDS: u64 = 6;
const BURST_SIZE: usize = (BURST_SECONDS * 1000 / CHUNK_DURATION_MS) as usize;

struct AppState {
    // We only need to expose the receiver factory to the web handlers.
    // The web handler will clone this to subscribe to the live radio feed.
    tx: broadcast::Sender<Bytes>,
    // RwLock allows multiple users to read the history at once,
    // but only the broadcaster can write to it.
    history: Arc<RwLock<VecDeque<Bytes>>>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("Starting Radio Server...");

    // Setup channels
    let (disk_tx, mut disk_rx) = mpsc::channel::<Bytes>(DISK_BUFFER_CAPACITY);
    let (radio_tx, _) = broadcast::channel::<Bytes>(BROADCAST_CAPACITY);

    // Initialize the History Buffer
    let history = Arc::new(RwLock::new(VecDeque::with_capacity(BURST_SIZE)));

    // Spawn Loader
    let disk_tx_clone = disk_tx.clone();
    tokio::task::spawn_blocking(move || {
        read_file_loop(disk_tx_clone);
    });

    // Spawn Broadcaster
    let radio_tx_clone = radio_tx.clone();
    let history_clone = history.clone(); // Clone for the broadcaster task
    tokio::spawn(async move {
        broadcast_loop(radio_tx_clone, &mut disk_rx, history_clone).await;
    });

    // Setup Web Server
    let app_state = Arc::new(AppState {
        tx: radio_tx,
        history
    });

    let app = Router::new()
        .route_service("/", ServeFile::new("web.html"))
        .route("/stream", get(stream_audio))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Listening on http://0.0.0.0:3000/stream");
    axum::serve(listener, app).await.unwrap();
}

// --- TASK 1: THE LOADER ---
fn read_file_loop(tx: mpsc::Sender<Bytes>) {
    loop {
        tracing::info!("(Re)loading audio file...");
        let file = match File::open(AUDIO_FILE_PATH) {
            Ok(f) => f,
            Err(e) => {
                tracing::error!("Failed to open file: {}. Retrying in 5s...", e);
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let mut reader = std::io::BufReader::with_capacity(BYTES_PER_CHUNK * 10, file);
        let mut buffer = vec![0u8; BYTES_PER_CHUNK];

        loop {
            match reader.read_exact(&mut buffer) {
                Ok(_) => {
                    let data = Bytes::from(buffer.clone());
                    if let Err(_) = tx.blocking_send(data) {
                        return;
                    }
                }
                Err(_) => break, // EOF or Error, restart file
            }
        }
    }
}

// --- TASK 2: THE BROADCASTER ---
async fn broadcast_loop(
    tx: broadcast::Sender<Bytes>,
    rx: &mut mpsc::Receiver<Bytes>,
    history: Arc<RwLock<VecDeque<Bytes>>>
) {
    let mut interval = tokio::time::interval(Duration::from_millis(CHUNK_DURATION_MS));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        interval.tick().await;
        if let Some(chunk) = rx.recv().await {
            // 1. Send to live listeners
            let _ = tx.send(chunk.clone());

            // 2. Save to history (Write Lock)
            let mut history_guard = history.write().await;
            if history_guard.len() >= BURST_SIZE {
                history_guard.pop_front(); // Remove oldest chunk
            }
            history_guard.push_back(chunk); // Add new chunk
        } else {
            break;
        }
    }
}

// --- TASK 3: THE WEB HANDLER (Fixed) ---
async fn stream_audio(State(state): State<Arc<AppState>>) -> Response {
    // 1. Subscribe to Live Stream (Future packets)
    let rx = state.tx.subscribe();

    // 2. Grab History (Past packets)
    // We clone the data out of the lock immediately so we don't hold the lock.
    let history_data: Vec<Bytes> = {
        let guard = state.history.read().await;
        guard.iter().cloned().collect()
    };

    // 3. Create the "Burst" Stream (The Past)
    // iter() creates a standard iterator, we wrap it in tokio_stream::iter
    let burst_stream = tokio_stream::iter(
        history_data.into_iter().map(|b| Ok(b))
    );

    // 4. Create the "Live" Stream (The Future)
    let live_stream = BroadcastStream::new(rx)
        .map(|result| match result {
            Ok(bytes) => Ok(bytes),
            Err(_) => Err(std::io::Error::new(std::io::ErrorKind::Other, "Lagged")),
        });

    // 5. Chain them together!
    // The browser receives the burst instantly (filling the buffer),
    // then seamlessly continues receiving the live chunks.
    let combined_stream = burst_stream.chain(live_stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "audio/mpeg")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(Body::from_stream(combined_stream))
        .unwrap()
}
