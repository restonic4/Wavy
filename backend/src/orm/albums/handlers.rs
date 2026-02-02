use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::state::AppState;
use crate::error::AppError;
use super::models::{CreateAlbumDto, UpdateAlbumDto, Album};
use super::repository;
use crate::auth::AdminOnly;

pub async fn list_albums(
    State(state): State<AppState>,
) -> Result<Json<Vec<Album>>, AppError> {
    let albums = repository::find_all(&state.db)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(albums))
}

pub async fn get_album(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Album>, AppError> {
    let album = repository::find_by_id(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?
        .ok_or(AppError::NotFound("Album not found".to_string()))?;
    Ok(Json(album))
}

pub async fn create_album(
    State(state): State<AppState>,
    _: AdminOnly,
    Json(payload): Json<CreateAlbumDto>,
) -> Result<Json<Album>, AppError> {
    let album = repository::create(&state.db, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(album))
}

pub async fn update_album(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateAlbumDto>,
) -> Result<Json<Album>, AppError> {
    let album = repository::update(&state.db, id, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(album))
}

pub async fn delete_album(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    repository::delete(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(StatusCode::NO_CONTENT)
}