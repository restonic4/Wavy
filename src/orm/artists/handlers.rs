use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::state::AppState;
use crate::error::AppError;
use super::models::{CreateArtistDto, UpdateArtistDto, Artist};
use super::repository;
use crate::auth::AdminOnly;

pub async fn list_artists(
    State(state): State<AppState>,
) -> Result<Json<Vec<Artist>>, AppError> {
    let artists = repository::find_all(&state.db)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(artists))
}

pub async fn get_artist(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Artist>, AppError> {
    let artist = repository::find_by_id(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?
        .ok_or(AppError::NotFound("Artist not found".to_string()))?;
    Ok(Json(artist))
}

pub async fn create_artist(
    State(state): State<AppState>,
    _: AdminOnly,
    Json(payload): Json<CreateArtistDto>,
) -> Result<Json<Artist>, AppError> {
    let artist = repository::create(&state.db, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(artist))
}

pub async fn update_artist(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateArtistDto>,
) -> Result<Json<Artist>, AppError> {
    let artist = repository::update(&state.db, id, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(artist))
}

pub async fn delete_artist(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    repository::delete(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(StatusCode::NO_CONTENT)
}