use sqlx::{Sqlite, Pool, QueryBuilder, SqlitePool};
use super::models::{TagRequest, SongSearchResult, Tag, CreateTagDto, UpdateTagDto};

pub async fn find_songs_by_vector(
    pool: &Pool<Sqlite>,
    criteria: Vec<TagRequest>,
) -> Result<Vec<SongSearchResult>, sqlx::Error> {
    
    // 1. Guard clause: If no tags requested, return empty or all (returning empty here)
    if criteria.is_empty() {
        return Ok(vec![]);
    }

    // 2. Start the Query Builder
    // We select ID and Title. 
    // Note: We avoid joining Artists here to prevent row multiplication affecting the math.
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        r#"
        SELECT 
            s.id, 
            s.title,
            SUM(
                CASE 
        "#
    );

    // 3. Dynamic CASE Loop
    // For every tag requested, we add a specific WHEN clause
    for (_i, tag) in criteria.iter().enumerate() {
        query_builder.push(" WHEN t.name = ");
        query_builder.push_bind(&tag.name);
        query_builder.push(" THEN (st.score - ");
        query_builder.push_bind(tag.target_score);
        query_builder.push(") * (st.score - ");
        query_builder.push_bind(tag.target_score);
        query_builder.push(") ");
    }

    // 4. Close the SUM and join tables
    query_builder.push(
        r#"
                ELSE 0 
                END
            ) as match_error
        FROM songs s
        JOIN song_tags st ON s.id = st.song_id
        JOIN tags t ON st.tag_id = t.id
        WHERE t.name IN (
        "#
    );

    // 5. Dynamic WHERE IN Loop
    // We need to list the tag names again for the filter: ('Summer', 'Christmas')
    let mut separated = query_builder.separated(", ");
    for tag in &criteria {
        separated.push_bind(&tag.name);
    }
    separated.push_unseparated(") ");

    // 6. Grouping and Final Filtering
    // Ensure we only return songs that have data for ALL the requested tags
    query_builder.push(" GROUP BY s.id HAVING COUNT(DISTINCT t.name) = ");
    query_builder.push_bind(criteria.len() as i64);
    
    // 7. Sort by lowest error (closest match)
    query_builder.push(" ORDER BY match_error ASC");

    // 8. Execute
    let query = query_builder.build_query_as::<SongSearchResult>();
    let songs = query.fetch_all(pool).await?;

    Ok(songs)
}

pub async fn find_all(pool: &SqlitePool) -> Result<Vec<Tag>, String> {
    sqlx::query_as!(
        Tag,
        "SELECT id as \"id!\", name FROM tags ORDER BY name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn find_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Tag>, String> {
    sqlx::query_as!(
        Tag,
        "SELECT id as \"id!\", name FROM tags WHERE id = ?",
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn create(pool: &SqlitePool, dto: CreateTagDto) -> Result<Tag, String> {
    sqlx::query_as!(
        Tag,
        "INSERT INTO tags (name) VALUES (?) RETURNING id as \"id!\", name",
        dto.name
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())
}

pub async fn update(pool: &SqlitePool, id: i64, dto: UpdateTagDto) -> Result<Tag, String> {
    let mut qb = sqlx::QueryBuilder::new("UPDATE tags SET ");
    let mut separated = qb.separated(", ");

    if let Some(name) = dto.name {
        separated.push("name = ");
        separated.push_bind_unseparated(name);
    }

    qb.push(" WHERE id = ");
    qb.push_bind(id);
    qb.push(" RETURNING id as \"id!\", name");

    let tag = qb.build_query_as::<Tag>()
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Tag not found".to_string())?;

    Ok(tag)
}

pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), String> {
    sqlx::query!(
        "DELETE FROM tags WHERE id = ?",
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
