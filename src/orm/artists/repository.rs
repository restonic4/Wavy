use sqlx::SqlitePool;
use super::models::{Artist, CreateArtistDto, UpdateArtistDto};

pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Artist>, String> {
    sqlx::query_as!(
        Artist,
        "SELECT id as \"id!\", name FROM artists ORDER BY name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn find_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Artist>, String> {
    sqlx::query_as!(
        Artist,
        "SELECT id as \"id!\", name FROM artists WHERE id = ?",
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(pool: &SqlitePool, dto: CreateArtistDto) -> Result<Artist, String> {
    sqlx::query_as!(
        Artist,
        "INSERT INTO artists (name) VALUES (?) RETURNING id as \"id!\", name",
        dto.name
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn update(pool: &SqlitePool, id: i64, dto: UpdateArtistDto) -> Result<Artist, String> {
    let mut qb = sqlx::QueryBuilder::new("UPDATE artists SET ");
    let mut separated = qb.separated(", ");

    if let Some(name) = dto.name {
        separated.push("name = ");
        separated.push_bind_unseparated(name);
    }

    qb.push(" WHERE id = ");
    qb.push_bind(id);
    qb.push(" RETURNING id, name");

    let artist = qb.build_query_as::<Artist>()
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Artist not found".to_string())?;

    Ok(artist)
}

pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), String> {
    sqlx::query!(
        "DELETE FROM artists WHERE id = ?",
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
