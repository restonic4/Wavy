use axum::extract::FromRef;
use std::collections::{VecDeque};
use std::sync::Arc;
use sqlx::SqlitePool;
use tokio::sync::{broadcast, RwLock};
use axum_extra::extract::cookie::Key;
use crate::streaming::model::{AudioFrame, StationData, StationEvent};

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