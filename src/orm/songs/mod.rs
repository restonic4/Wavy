pub mod models;
pub mod repository;
pub mod handlers;
pub mod upload;
use axum::Router;
use axum::routing::{get, post};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/songs", get(handlers::list_songs).post(handlers::create_song))
        .route("/songs/upload", post(upload::upload_song))
        .route("/songs/{id}", get(handlers::get_song).post(handlers::update_song).delete(handlers::delete_song))
}
