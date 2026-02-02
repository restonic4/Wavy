use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// Input: One specific tag and the desired score (e.g., "Summer", 0.8)
#[derive(Debug, Serialize, Deserialize)]
pub struct TagRequest {
    pub name: String,
    pub target_score: f64,
}

// Output: The song and its calculated "distance" (error)
#[derive(Debug, FromRow, Serialize)]
pub struct SongSearchResult {
    pub id: i64,
    pub title: String,
    pub artist_names: Option<String>,
    pub album_title: Option<String>,
    pub has_image: bool,
    pub match_error: f64,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct SongTag {
    pub song_id: i64,
    pub tag_id: i64,
    pub score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TagInfo {
    pub tag_id: i64,
    pub name: String,
    pub score: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagDto {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTagDto {
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssignTagDto {
    pub tag_id: i64,
    pub score: f64,
}
