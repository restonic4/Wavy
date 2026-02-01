use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::state::AppState;
use crate::error::AppError;
use super::models::{CreateSongDto, UpdateSongDto, Song};
use super::repository;
use crate::auth::AdminOnly;

pub async fn list_songs(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<Song>>, AppError> {
    if let Some(query) = params.get("q") {
        let songs = repository::search(&state.db, query)
            .await
            .map_err(AppError::InternalServerError)?;
        return Ok(Json(songs));
    }

    let songs = repository::find_all(&state.db)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(songs))
}

pub async fn get_song(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Song>, AppError> {
    let song = repository::find_by_id(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?
        .ok_or(AppError::NotFound("Song not found".to_string()))?;
    Ok(Json(song))
}

pub async fn get_song_image(
    Path(id): Path<i64>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    let image_path = std::path::PathBuf::from("data").join(format!("{}.png", id));
    
    if !image_path.exists() {
        return Err(AppError::NotFound("Image not found".to_string()));
    }

    let file = tokio::fs::read(&image_path).await
        .map_err(|e| AppError::InternalServerError(format!("Failed to read image: {}", e)))?;

    Ok((
        [(axum::http::header::CONTENT_TYPE, "image/png")],
        file
    ))
}

pub async fn create_song(
    State(state): State<AppState>,
    _: AdminOnly,
    Json(payload): Json<CreateSongDto>,
) -> Result<Json<Song>, AppError> {
    let song = repository::create(&state.db, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(song))
}

pub async fn update_song(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateSongDto>,
) -> Result<Json<Song>, AppError> {
    let song = repository::update(&state.db, id, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(song))
}

pub async fn delete_song(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    // Delete from DB first
    repository::delete(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?;

    // Delete the file if it exists
    let file_path = std::path::PathBuf::from("data").join(format!("{}.mp3", id));
    if file_path.exists() {
        let _ = tokio::fs::remove_file(file_path).await;
    }

    let image_path = std::path::PathBuf::from("data").join(format!("{}.png", id));
    if image_path.exists() {
        let _ = tokio::fs::remove_file(image_path).await;
    }

    Ok(StatusCode::NO_CONTENT)
}