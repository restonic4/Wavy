mod broadcaster;
mod config;
mod handlers;
mod auth;
mod loader;
mod state;
mod orm;

use crate::config::{BROADCAST_BUFFER_FRAMES, DISK_BUFFER_FRAMES};
use crate::state::{AppState, AudioFrame, StationData};
use axum::{
    routing::{get, post},
    Router,
};
use std::collections::VecDeque;
use std::env;
use std::str::FromStr;
use std::sync::Arc;
use dotenvy::dotenv;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tokio::sync::{broadcast, mpsc, RwLock};
use tower_http::services::ServeFile;
use axum_extra::extract::cookie::Key;

mod error;

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::fmt::init();
    tracing::info!("🎵 Starting Wavy Radio Server v2.0...");

    // DB initialization
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let db_options = SqliteConnectOptions::from_str(&*db_url)
        .expect("Invalid connection string")
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(db_options)
        .await
        .expect("Failed to connect to database");

    tracing::info!("💽 Database connected. Running migrations...");

    // Migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Create channels for frame streaming
    let (disk_tx, disk_rx) = mpsc::channel::<AudioFrame>(DISK_BUFFER_FRAMES);
    let (radio_tx, _) = broadcast::channel::<AudioFrame>(BROADCAST_BUFFER_FRAMES);

    let radio_tx_for_broadcaster = radio_tx.clone();

    // Shared state
    let buffer_history = Arc::new(RwLock::new(VecDeque::<AudioFrame>::new()));
    let station_data = Arc::new(RwLock::new(StationData::default()));

    // Load signing key from environment variable
    let key_str = env::var("COOKIE_KEY").expect("COOKIE_KEY must be set in .env");
    let key = Key::from(key_str.as_bytes());

    let app_state = AppState {
        tx: radio_tx,
        buffer_history: buffer_history.clone(),
        station: station_data.clone(),
        db: pool,
        key: key.clone(),
    };

    // Start the loader (reads MP3 files and sends frames)
    loader::start(disk_tx, Arc::new(app_state.clone()));

    // Start the broadcaster (paces frames and manages buffer)
    let history_clone = buffer_history.clone();
    tokio::spawn(async move {
        broadcaster::start(radio_tx_for_broadcaster, disk_rx, history_clone).await;
    });

    // Setup web server
    // Setup web server
    let api_routes = Router::new()
        .merge(orm::users::router())
        .merge(orm::artists::router())
        .merge(orm::albums::router())
        .merge(orm::songs::router())
        .merge(orm::tags::router())
        .route("/stream", get(handlers::stream_audio))
        .route("/status", get(handlers::get_status))
        .route("/heartbeat", post(handlers::heartbeat));

    let app = Router::new()
        .route_service("/", ServeFile::new("../backend/web.html"))
        .nest("/api", api_routes)
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    tracing::info!("🎧 Server ready at http://0.0.0.0:3000");
    tracing::info!("📁 Playing MP3s from: {}", config::DATA_FOLDER);

    axum::serve(listener, app).await.unwrap();
}