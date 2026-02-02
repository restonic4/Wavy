pub mod models;
pub mod repository;
pub mod handlers;
use axum::Router;
use axum::routing::{get, post, delete};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/tags", get(handlers::list_tags).post(handlers::create_tag))
        .route("/tags/{id}", get(handlers::get_tag).post(handlers::update_tag).delete(handlers::delete_tag))
        .route("/tags/search", post(handlers::search_songs))
        .route("/songs/{song_id}/tags", get(handlers::list_song_tags).post(handlers::assign_tag))
        .route("/songs/{song_id}/tags/{tag_id}", delete(handlers::remove_tag))
}