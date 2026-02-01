use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

use crate::state::AppState;
use crate::error::AppError;
use super::models::{CreateTagDto, UpdateTagDto, Tag, AssignTagDto, TagInfo, TagRequest, SongSearchResult};
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

pub async fn assign_tag(
    State(state): State<AppState>,
    _: AdminOnly,
    Path(song_id): Path<i64>,
    Json(payload): Json<AssignTagDto>,
) -> Result<StatusCode, AppError> {
    repository::assign_to_song(&state.db, song_id, payload.tag_id, payload.score)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(StatusCode::OK)
}

pub async fn list_song_tags(
    State(state): State<AppState>,
    Path(song_id): Path<i64>,
) -> Result<Json<Vec<TagInfo>>, AppError> {
    let tags = repository::find_by_song(&state.db, song_id)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(Json(tags))
}

pub async fn search_songs(
    State(state): State<AppState>,
    Json(criteria): Json<Vec<TagRequest>>,
) -> Result<Json<Vec<SongSearchResult>>, AppError> {
    let results = repository::find_songs_by_vector(&state.db, criteria)
        .await
        .map_err(|e| AppError::InternalServerError(e.to_string()))?;
    Ok(Json(results))
}

pub async fn remove_tag(
    State(state): State<AppState>,
    _: AdminOnly,
    Path((song_id, tag_id)): Path<(i64, i64)>,
) -> Result<StatusCode, AppError> {
    repository::remove_from_song(&state.db, song_id, tag_id)
        .await
        .map_err(AppError::InternalServerError)?;
    Ok(StatusCode::NO_CONTENT)
}