pub mod models;
pub mod repository;
pub mod handlers;
use axum::Router;
use axum::routing::{get, post};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/albums", get(handlers::list_albums).post(handlers::create_album))
        .route("/albums/{id}", get(handlers::get_album).post(handlers::update_album).delete(handlers::delete_album))
}
