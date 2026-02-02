pub mod models;
pub mod repository;
pub mod handlers;
use axum::Router;
use axum::routing::{get, post};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/artists", get(handlers::list_artists).post(handlers::create_artist))
        .route("/artists/{id}", get(handlers::get_artist).post(handlers::update_artist).delete(handlers::delete_artist))
}
