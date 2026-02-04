use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct HeartbeatResponse {
    pub desync_ms: i64,
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