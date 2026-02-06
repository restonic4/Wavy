use sqlx::SqlitePool;
use super::models::{User, CreateUserDto, UpdateUserDto};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHasher, SaltString
    },
    Argon2
};

pub async fn create(pool: &SqlitePool, dto: CreateUserDto) -> Result<User, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(dto.password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    let user_count: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let role = if user_count == 0 { "admin" } else { "user" };

    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
        RETURNING id as "id!", username, password_hash, artist_id, role, total_listen_time
        "#,
        dto.username,
        password_hash,
        role
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(user)
}

pub async fn find_by_username(pool: &SqlitePool, username: &str) -> Result<Option<User>, String> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT id as "id!", username, password_hash, artist_id, role, total_listen_time
        FROM users
        WHERE username = ?
        "#,
        username
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(user)
}

pub async fn find_by_id(pool: &SqlitePool, id: i64) -> Result<Option<User>, String> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT id as "id!", username, password_hash, artist_id, role, total_listen_time
        FROM users
        WHERE id = ?
        "#,
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(user)
}

pub async fn update(pool: &SqlitePool, id: i64, dto: UpdateUserDto) -> Result<User, String> {
    let mut password_hash = None;
    if let Some(password) = dto.password {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        password_hash = Some(
            argon2.hash_password(password.as_bytes(), &salt)
                .map_err(|e| e.to_string())?
                .to_string()
        );
    }
    
    let mut qb = sqlx::QueryBuilder::new("UPDATE users SET ");
    let mut separated = qb.separated(", ");

    if let Some(username) = dto.username {
        separated.push("username = ");
        separated.push_bind_unseparated(username);
    }
    if let Some(ph) = password_hash {
        separated.push("password_hash = ");
        separated.push_bind_unseparated(ph);
    }
    if let Some(artist_id) = dto.artist_id {
        separated.push("artist_id = ");
        separated.push_bind_unseparated(artist_id);
    }
    if let Some(role) = dto.role {
        separated.push("role = ");
        separated.push_bind_unseparated(role);
    }

    qb.push(" WHERE id = ");
    qb.push_bind(id);
    qb.push(" RETURNING id, username, password_hash, artist_id, role, total_listen_time");

    let user = qb.build_query_as::<User>()
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("User not found".to_string())?;

    Ok(user)
}

pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), String> {
    sqlx::query!(
        "DELETE FROM users WHERE id = ?",
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn increment_listen_time(pool: &SqlitePool, id: i64, seconds: i64) -> Result<(), String> {
    sqlx::query!(
        "UPDATE users SET total_listen_time = total_listen_time + ? WHERE id = ?",
        seconds,
        id
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn get_top_listeners(pool: &SqlitePool, limit: i64) -> Result<Vec<User>, String> {
    sqlx::query_as!(
        User,
        r#"
        SELECT id as "id!", username, password_hash, artist_id, role, total_listen_time
        FROM users
        ORDER BY total_listen_time DESC
        LIMIT ?
        "#,
        limit
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}
