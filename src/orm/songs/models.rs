use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Song {
    pub id: i64,
    pub title: String,
    pub album_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSongDto {
    pub title: String,
    pub album_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSongDto {
    pub title: Option<String>,
    pub album_id: Option<i64>,
}
