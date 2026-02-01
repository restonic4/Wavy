use sqlx::SqlitePool;
use super::models::{Song, CreateSongDto, UpdateSongDto};

pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Song>, String> {
    sqlx::query_as!(
        Song,
        r#"
        SELECT 
            s.id as "id!", 
            s.title, 
            s.album_id,
            al.title as album_title,
            GROUP_CONCAT(a.name, ', ') as artist_names
        FROM songs s
        LEFT JOIN song_artists sa ON s.id = sa.song_id
        LEFT JOIN artists a ON sa.artist_id = a.id
        LEFT JOIN albums al ON s.album_id = al.id
        GROUP BY s.id
        ORDER BY s.title
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn find_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Song>, String> {
    sqlx::query_as!(
        Song,
        r#"
        SELECT 
            s.id as "id!", 
            s.title, 
            s.album_id,
            al.title as album_title,
            GROUP_CONCAT(a.name, ', ') as artist_names
        FROM songs s
        LEFT JOIN song_artists sa ON s.id = sa.song_id
        LEFT JOIN artists a ON sa.artist_id = a.id
        LEFT JOIN albums al ON s.album_id = al.id
        WHERE s.id = ?
        GROUP BY s.id
        "#,
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(pool: &SqlitePool, dto: CreateSongDto) -> Result<Song, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let song_id = sqlx::query!(
        "INSERT INTO songs (title, album_id) VALUES (?, ?)",
        dto.title, dto.album_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?
    .last_insert_rowid();

    if let Some(artist_ids) = dto.artist_ids {
        for artist_id in artist_ids {
            sqlx::query!(
                "INSERT INTO song_artists (song_id, artist_id) VALUES (?, ?)",
                song_id, artist_id
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    // Fetch final result with artist names
    find_by_id(pool, song_id)
        .await?
        .ok_or("Song not found after creation".to_string())
}

pub async fn update(pool: &SqlitePool, id: i64, dto: UpdateSongDto) -> Result<Song, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let mut qb = sqlx::QueryBuilder::new("UPDATE songs SET ");
    let mut separated = qb.separated(", ");
    let mut has_updates = false;

    if let Some(title) = dto.title {
        separated.push("title = ");
        separated.push_bind_unseparated(title);
        has_updates = true;
    }
    if let Some(album_id) = dto.album_id {
        separated.push("album_id = ");
        separated.push_bind_unseparated(album_id);
        has_updates = true;
    }

    if has_updates {
        qb.push(" WHERE id = ");
        qb.push_bind(id);

        qb.build()
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    if let Some(artist_ids) = dto.artist_ids {
        // Clear existing artists and replace with new set
        sqlx::query!("DELETE FROM song_artists WHERE song_id = ?", id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        for artist_id in artist_ids {
            sqlx::query!(
                "INSERT INTO song_artists (song_id, artist_id) VALUES (?, ?)",
                id, artist_id
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    // Fetch final result
    find_by_id(pool, id)
        .await?
        .ok_or("Song not found after update".to_string())
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
