use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::state::AppState;
use crate::error::AppError;
use super::models::{CreateTagDto, UpdateTagDto, Tag};
use super::repository;
use crate::auth::AdminOnly;

pub async fn list_tags(
    State(state): State<AppState>,
) -> Result<Json<Vec<Tag>>, AppError> {
    let tags = repository::find_all(&state.db)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(tags))
}

pub async fn get_tag(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Tag>, AppError> {
    let tag = repository::find_by_id(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?
        .ok_or(AppError::NotFound("Tag not found".to_string()))?;
    Ok(Json(tag))
}

pub async fn create_tag(
    State(state): State<AppState>,
    _: AdminOnly,
    Json(payload): Json<CreateTagDto>,
) -> Result<Json<Tag>, AppError> {
    let tag = repository::create(&state.db, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(tag))
}

pub async fn update_tag(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateTagDto>,
) -> Result<Json<Tag>, AppError> {
    let tag = repository::update(&state.db, id, payload)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(tag))
}

pub async fn delete_tag(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    repository::delete(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(StatusCode::NO_CONTENT)
}