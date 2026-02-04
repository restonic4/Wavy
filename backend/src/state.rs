use axum::extract::FromRef;
use bytes::Bytes;
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::Duration;
use crate::orm::songs::models::Song;
use sqlx::SqlitePool;
use tokio::sync::{broadcast, RwLock};
use axum_extra::extract::cookie::Key;

/// Information about a connected listener
#[derive(Clone, Serialize, Debug)]
pub struct Listener {
    pub user_id: i64,
    pub username: String,
    pub connected_at: DateTime<Utc>,
    pub last_heartbeat: DateTime<Utc>,
    /// The frame index when this listener connected
    pub start_frame_index: u64,
    /// Duration of burst buffer sent to this listener (in milliseconds)
    pub burst_buffer_ms: u64,
    /// Last time the listener's progress was saved to the database
    pub last_saved_at: DateTime<Utc>,
}

impl Listener {
    /// Check if listener hasn't sent a heartbeat in the specified duration
    pub fn is_stale(&self, timeout_seconds: i64) -> bool {
        let now = Utc::now();
        let elapsed = now.signed_duration_since(self.last_heartbeat);
        elapsed.num_seconds() > timeout_seconds
    }
}

/// Tracks the server's current playback position
#[derive(Clone, Debug)]
pub struct ServerPlaybackPosition {
    /// Current frame index being broadcast
    pub current_frame_index: u64,
    /// Timestamp when the server started broadcasting
    pub server_start_time: DateTime<Utc>,
    /// Total duration of audio played so far (in milliseconds)
    pub total_duration_ms: u64,
}

impl Default for ServerPlaybackPosition {
    fn default() -> Self {
        Self {
            current_frame_index: 0,
            server_start_time: Utc::now(),
            total_duration_ms: 0,
        }
    }
}

#[derive(Clone, Serialize, Debug)]
pub struct CurrentSong {
    pub id: i64,
    pub title: String,
    pub artist_names: Option<String>,
    pub album_title: Option<String>,
    pub duration_ms: u64,
    pub started_at: DateTime<Utc>,
}

#[derive(Default)]
pub struct StationData {
    /// Active stream listeners tracked by their User ID
    pub listeners: HashMap<i64, Listener>,
    /// Server's current playback position
    pub playback_position: ServerPlaybackPosition,
    /// Information about the currently playing song
    pub current_song: Option<CurrentSong>,
}

/// Messages sent from the loader to the broadcaster
#[derive(Clone)]
pub enum StreamMessage {
    Frame(AudioFrame),
    SongStart(Song, u64), // Song, duration_ms
}

/// An MP3 frame with its precise timing information
#[derive(Clone)]
pub struct AudioFrame {
    pub data: Bytes,
    pub duration: Duration,
}

#[derive(Clone, Serialize, Debug)]
#[serde(tag = "type", content = "data")]
pub enum StationEvent {
    SongChange(CurrentSong),
}

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<AudioFrame>,
    pub event_tx: broadcast::Sender<StationEvent>,
    pub buffer_history: Arc<RwLock<VecDeque<AudioFrame>>>,
    pub station: Arc<RwLock<StationData>>,
    pub db: SqlitePool,
    pub cookie_key: Key,
}

impl FromRef<AppState> for Arc<RwLock<StationData>> {
    fn from_ref(state: &AppState) -> Self {
        state.station.clone()
    }
}

impl FromRef<AppState> for Key {
    fn from_ref(state: &AppState) -> Self {
        state.cookie_key.clone()
    }
}