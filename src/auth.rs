use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};
use axum_extra::extract::cookie::{Key, PrivateCookieJar};

use crate::state::AppState;
use crate::error::AppError;
use crate::orm::users::{models::User, repository};

pub const AUTH_COOKIE_NAME: &str = "auth_session";

// Extractors

pub struct AuthUser(pub User);

impl AuthUser {
    pub fn is_minimod(&self) -> bool {
        matches!(self.0.role.as_str(), "minimod" | "mod" | "admin")
    }

    pub fn is_mod(&self) -> bool {
        matches!(self.0.role.as_str(), "mod" | "admin")
    }

    pub fn is_admin(&self) -> bool {
        matches!(self.0.role.as_str(), "admin")
    }
}

pub struct AdminOnly(pub User);

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let jar = PrivateCookieJar::<Key>::from_request_parts(parts, state)
            .await
            .map_err(|e| AppError::InternalServerError(format!("Cookie extractor failed: {:?}", e)))?;

        let cookie = jar
            .get(AUTH_COOKIE_NAME)
            .ok_or(AppError::Unauthorized("Please log in".to_string()))?;

        // Parse ID as i64
        let user_id = cookie.value().parse::<i64>()
            .map_err(|_| AppError::Unauthorized("Invalid session".to_string()))?;

        let user = repository::find_by_id(&state.db, user_id)
            .await
            .map_err(|e| AppError::InternalServerError(e))?
            .ok_or(AppError::Unauthorized("User not found".to_string()))?;

        Ok(AuthUser(user))
    }
}

impl FromRequestParts<AppState> for AdminOnly {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let auth_user = AuthUser::from_request_parts(parts, state).await?;

        if auth_user.is_admin() {
            Ok(AdminOnly(auth_user.0))
        } else {
            Err(AppError::Unauthorized("Admin permissions required".to_string()))
        }
    }
}
