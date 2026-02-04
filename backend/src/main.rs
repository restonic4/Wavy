mod config;
mod auth;
mod state;
mod orm;

use crate::config::{BROADCAST_BUFFER_FRAMES, DISK_BUFFER_FRAMES};
use crate::state::{AppState, AudioFrame, StationData, StreamMessage, StationEvent};
use chrono::{Utc, Duration};
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
use tower_http::cors::CorsLayer;
use axum::http::{Method, HeaderValue};
use axum_extra::extract::cookie::Key;
use streaming::{broadcaster, handlers, loader};

mod error;
mod streaming;
mod rhythm;

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::fmt::init();

    let version = env!("CARGO_PKG_VERSION");
    tracing::info!("Starting Wavy Radio Server v{}", version);

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

    tracing::info!("Database connected. Running migrations...");

    // Migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Create channels for frame streaming
    let (disk_tx, disk_rx) = mpsc::channel::<StreamMessage>(DISK_BUFFER_FRAMES);
    let (radio_tx, _) = broadcast::channel::<AudioFrame>(BROADCAST_BUFFER_FRAMES);
    let (event_tx, _) = broadcast::channel::<StationEvent>(100);

    let radio_tx_for_broadcaster = radio_tx.clone();

    // Shared state
    let buffer_history = Arc::new(RwLock::new(VecDeque::<AudioFrame>::new()));
    let station_data = Arc::new(RwLock::new(StationData::default()));

    // Load signing key from environment variable
    let cookie_key_str = env::var("COOKIE_KEY").expect("COOKIE_KEY must be set in .env");
    let cookie_key = Key::from(cookie_key_str.as_bytes());

    let app_state = AppState {
        tx: radio_tx,
        event_tx,
        buffer_history: buffer_history.clone(),
        station: station_data.clone(),
        db: pool,
        cookie_key: cookie_key.clone(),
    };

    // Start the loader (reads MP3 files and sends frames)
    loader::start(disk_tx, Arc::new(app_state.clone()));

    // Start the broadcaster (paces frames and manages buffer)
    let history_clone = buffer_history.clone();
    let station_clone = station_data.clone();
    let event_tx_clone = app_state.event_tx.clone();
    tokio::spawn(async move {
        broadcaster::start(radio_tx_for_broadcaster, event_tx_clone, disk_rx, history_clone, station_clone).await;
    });

    // Start listener cleanup task (removes stale listeners)
    // Start listener cleanup & Leaderboard update task
    let station_cleanup = station_data.clone();
    let db_update = app_state.db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
        loop {
            interval.tick().await;
            
            let mut updates = Vec::new();

            // Scope for Write Lock
            {
                let mut guard = station_cleanup.write().await;
                let now = Utc::now();
                
                // Collect IDs to remove
                let stale_ids: Vec<i64> = guard.listeners.iter()
                    .filter(|(_, l)| l.is_stale(20))
                    .map(|(&id, _)| id)
                    .collect();
                
                if !stale_ids.is_empty() {
                    tracing::info!("Removing {} stale listeners", stale_ids.len());
                    for id in stale_ids {
                        if let Some(removed) = guard.listeners.remove(&id) {
                            tracing::debug!("Removed stale listener: {} (ID: {})", removed.username, removed.user_id);
                        }
                    }
                }

                // Accumulate listen time for remaining active listeners
                for listener in guard.listeners.values_mut() {
                    let elapsed_ms = now.signed_duration_since(listener.last_saved_at).num_milliseconds();
                    
                    // Only update if we have at least 1 second to add
                    if elapsed_ms >= 1000 {
                        let seconds_to_add = elapsed_ms / 1000;
                        if seconds_to_add > 0 {
                            updates.push((listener.user_id, seconds_to_add));
                            // Advance last_saved_at by the exact amount we're saving
                            // This preserves the remainder milliseconds for the next update
                            listener.last_saved_at = listener.last_saved_at + Duration::seconds(seconds_to_add);
                        }
                    } else if elapsed_ms < 0 {
                        // Handle potential clock skew
                        listener.last_saved_at = now;
                    }
                }
            } // Drop lock

            // Update DB (outside lock)
            for (user_id, seconds) in updates {
                let result = sqlx::query!(
                    "UPDATE users SET total_listen_time = total_listen_time + ? WHERE id = ?",
                    seconds,
                    user_id
                )
                .execute(&db_update)
                .await;

                if let Err(e) = result {
                    tracing::error!("Failed to update listen time for user {}: {}", user_id, e);
                }
            }
        }
    });

    // Setup web server
    let api_routes = Router::new()
        .merge(orm::users::router())
        .merge(orm::artists::router())
        .merge(orm::albums::router())
        .merge(orm::songs::router())
        .merge(orm::tags::router())
        .route("/stream", get(handlers::stream_audio))
        .route("/heartbeat", post(handlers::heartbeat))
        .route("/listeners", get(handlers::get_active_listeners))
        .route("/song/current", get(handlers::get_current_song))
        .route("/ws", get(handlers::ws_handler));

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3001".parse::<HeaderValue>().unwrap(),
            "http://127.0.0.1:3001".parse::<HeaderValue>().unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::COOKIE,
        ])
        .allow_credentials(true);

    let app = Router::new()
        .route_service("/", ServeFile::new("../backend/web.html"))
        .nest("/api", api_routes)
        .layer(cors)
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    tracing::info!("Server ready at http://0.0.0.0:3000");
    tracing::info!("Playing MP3s from: {}", config::get_music_dir().display());

    axum::serve(listener, app).await.unwrap();
}