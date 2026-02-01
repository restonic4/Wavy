use sqlx::SqlitePool;
use super::models::{Album, CreateAlbumDto, UpdateAlbumDto};

pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Album>, String> {
    sqlx::query_as!(
        Album,
        "SELECT id as \"id!\", title FROM albums ORDER BY title"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn find_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Album>, String> {
    sqlx::query_as!(
        Album,
        "SELECT id as \"id!\", title FROM albums WHERE id = ?",
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(pool: &SqlitePool, dto: CreateAlbumDto) -> Result<Album, String> {
    sqlx::query_as!(
        Album,
        "INSERT INTO albums (title) VALUES (?) RETURNING id as \"id!\", title",
        dto.title
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn update(pool: &SqlitePool, id: i64, dto: UpdateAlbumDto) -> Result<Album, String> {
    let mut qb = sqlx::QueryBuilder::new("UPDATE albums SET ");
    let mut separated = qb.separated(", ");

    if let Some(title) = dto.title {
        separated.push("title = ");
        separated.push_bind_unseparated(title);
    }

    qb.push(" WHERE id = ");
    qb.push_bind(id);
    qb.push(" RETURNING id, title");

    let album = qb.build_query_as::<Album>()
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Album not found".to_string())?;

    Ok(album)
}

pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), String> {
    sqlx::query!(
        "DELETE FROM albums WHERE id = ?",
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
