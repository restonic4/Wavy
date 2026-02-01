use sqlx::SqlitePool;
use super::models::{Song, CreateSongDto, UpdateSongDto};

pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Song>, String> {
    sqlx::query_as!(
        Song,
        "SELECT id as \"id!\", title, album_id FROM songs ORDER BY title"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn find_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Song>, String> {
    sqlx::query_as!(
        Song,
        "SELECT id as \"id!\", title, album_id FROM songs WHERE id = ?",
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(pool: &SqlitePool, dto: CreateSongDto) -> Result<Song, String> {
    sqlx::query_as!(
        Song,
        "INSERT INTO songs (title, album_id) VALUES (?, ?) RETURNING id as \"id!\", title, album_id",
        dto.title, dto.album_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn update(pool: &SqlitePool, id: i64, dto: UpdateSongDto) -> Result<Song, String> {
    let mut qb = sqlx::QueryBuilder::new("UPDATE songs SET ");
    let mut separated = qb.separated(", ");

    if let Some(title) = dto.title {
        separated.push("title = ");
        separated.push_bind_unseparated(title);
    }
    if let Some(album_id) = dto.album_id {
        separated.push("album_id = ");
        separated.push_bind_unseparated(album_id);
    }

    qb.push(" WHERE id = ");
    qb.push_bind(id);
    qb.push(" RETURNING id, title, album_id");

    let song = qb.build_query_as::<Song>()
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Song not found".to_string())?;

    Ok(song)
}

pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), String> {
    sqlx::query!(
        "DELETE FROM songs WHERE id = ?",
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
