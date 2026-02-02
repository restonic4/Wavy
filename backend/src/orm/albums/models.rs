use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Album {
    pub id: i64,
    pub title: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAlbumDto {
    pub title: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAlbumDto {
    pub title: Option<String>,
}
