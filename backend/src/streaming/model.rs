use std::collections::HashMap;
use std::time::Duration;
use bytes::Bytes;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use crate::orm::songs::models::Song;

#[derive(Serialize)]
pub struct HeartbeatResponse {
    pub desync_ms: i64,
    pub server_position_ms: u64,
    pub client_base_pos_ms: u64,
}

#[derive(Deserialize)]
pub struct HeartbeatQuery {
    pub(crate) client_position_ms: Option<u64>,
}

#[derive(Serialize)]
pub struct ActiveListenerDto {
    pub username: String,
    pub connected_at: DateTime<Utc>,
    pub listen_time_ms: i64,
}

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
    /// The absolute server duration position when this listener connected (precise)
    pub start_total_duration_micros: u128,
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
    /// Total duration of audio played so far (in microseconds for precision)
    pub total_duration_micros: u128,
}

impl Default for ServerPlaybackPosition {
    fn default() -> Self {
        Self {
            current_frame_index: 0,
            server_start_time: Utc::now(),
            total_duration_micros: 0,
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
    pub started_at_ms: u64, // Derived from micros
    #[serde(skip)]
    pub started_at_micros: u128, // High precision tracking
    pub rhythm_data: Option<String>, // Base64 encoded compiled rhythm data
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
    SongStart(Song, u64, Option<Vec<u8>>), // Song, duration_ms, rhythm_data
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