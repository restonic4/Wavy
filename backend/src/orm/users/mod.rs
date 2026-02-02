pub mod models;
pub mod repository;
pub mod handlers;

use axum::Router;
use axum::routing::{get, post};

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(handlers::register))
        .route("/auth/login", post(handlers::login))
        .route("/auth/logout", post(handlers::logout))
        .route("/auth/me", get(handlers::get_me))
        .route("/users/leaderboard", get(handlers::get_leaderboard))
        .route("/users/{id}", post(handlers::update_user).delete(handlers::delete_user))
}
