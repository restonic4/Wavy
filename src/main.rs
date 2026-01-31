mod broadcaster;
mod config;
mod handlers;
mod loader;
mod state;

use crate::config::{BROADCAST_BUFFER_FRAMES, DISK_BUFFER_FRAMES};
use crate::state::{AppState, AudioFrame, StationData};
use axum::{
    routing::{get, post},
    Router,
};
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};
use tower_http::services::ServeFile;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("🎵 Starting Wavy Radio Server v2.0...");

    // Create channels for frame streaming
    let (disk_tx, disk_rx) = mpsc::channel::<AudioFrame>(DISK_BUFFER_FRAMES);
    let (radio_tx, _) = broadcast::channel::<AudioFrame>(BROADCAST_BUFFER_FRAMES);

    let radio_tx_for_broadcaster = radio_tx.clone();

    // Shared state
    let buffer_history = Arc::new(RwLock::new(VecDeque::<AudioFrame>::new()));
    let station_data = Arc::new(RwLock::new(StationData::default()));

    let app_state = AppState {
        tx: radio_tx,
        buffer_history: buffer_history.clone(),
        station: station_data.clone(),
    };

    // Start the loader (reads MP3 files and sends frames)
    loader::start(disk_tx, Arc::new(app_state.clone()));

    // Start the broadcaster (paces frames and manages buffer)
    let history_clone = buffer_history.clone();
    tokio::spawn(async move {
        broadcaster::start(radio_tx_for_broadcaster, disk_rx, history_clone).await;
    });

    // Setup web server
    let app = Router::new()
        .route_service("/", ServeFile::new("web.html"))
        .route("/stream", get(handlers::stream_audio))
        .route("/api/status", get(handlers::get_status))
        .route("/api/heartbeat", post(handlers::heartbeat))
        .with_state(Arc::new(app_state));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    tracing::info!("🎧 Server ready at http://0.0.0.0:3000");
    tracing::info!("📁 Playing MP3s from: {}", config::DATA_FOLDER);

    axum::serve(listener, app).await.unwrap();
}