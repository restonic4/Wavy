use axum::extract::FromRef;
use bytes::Bytes;
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, RwLock};

#[derive(Clone, Serialize, Debug)]
pub struct SongMetadata {
    pub id: u64,
    pub title: String,
    pub artist: Option<String>,
    pub duration_seconds: f64,
    pub started_at: DateTime<Utc>,
    pub sample_rate: u32,
}

#[derive(Clone, Serialize, Debug)]
pub struct Listener {
    pub username: String,
    pub current_song_id: u64,
    pub drift_seconds: f64,
    pub last_seen: DateTime<Utc>,
}

#[derive(Default)]
pub struct StationData {
    pub history: VecDeque<SongMetadata>,
    pub listeners: HashMap<String, Listener>,
}

/// An MP3 frame with its precise timing information
#[derive(Clone)]
pub struct AudioFrame {
    pub data: Bytes,
    pub duration: Duration,
}

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<AudioFrame>,
    pub buffer_history: Arc<RwLock<VecDeque<AudioFrame>>>,
    pub station: Arc<RwLock<StationData>>,
}

impl FromRef<AppState> for Arc<RwLock<StationData>> {
    fn from_ref(state: &AppState) -> Self {
        state.station.clone()
    }
}