use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Artist {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateArtistDto {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateArtistDto {
    pub name: Option<String>,
}
