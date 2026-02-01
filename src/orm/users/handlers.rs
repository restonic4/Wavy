use axum::{
    extract::State,
    http::StatusCode,
    Json as AxumJson,
};
use axum_extra::extract::cookie::{Cookie, Key, PrivateCookieJar, SameSite};

use crate::state::AppState;
use crate::error::AppError;
use super::{models::{CreateUserDto, LoginPayload, User}, repository};
use crate::auth::{AUTH_COOKIE_NAME, AuthUser};
use argon2::{
    password_hash::{
        PasswordHash, PasswordVerifier
    },
    Argon2
};

use time::Duration;

pub async fn register(
    State(state): State<AppState>,
    jar: PrivateCookieJar<Key>,
    AxumJson(payload): AxumJson<CreateUserDto>,
) -> Result<(StatusCode, PrivateCookieJar<Key>, AxumJson<User>), AppError> {
    // Check if user exists
    if let Ok(Some(_)) = repository::find_by_username(&state.db, &payload.username).await {
         return Err(AppError::Conflict("Username already taken".to_string()));
    }

    let user = repository::create(&state.db, payload).await.map_err(AppError::InternalServerError)?;

    // Auto login
    let mut cookie = Cookie::new(AUTH_COOKIE_NAME, user.id.to_string());
    cookie.set_http_only(true);
    cookie.set_path("/");
    cookie.set_same_site(SameSite::Lax);
    cookie.set_max_age(Duration::days(30));
    
    let jar = jar.add(cookie);

    Ok((StatusCode::CREATED, jar, AxumJson(user)))
}

pub async fn login(
    State(state): State<AppState>,
    jar: PrivateCookieJar<Key>,
    AxumJson(payload): AxumJson<LoginPayload>,
) -> Result<(PrivateCookieJar<Key>, AxumJson<User>), AppError> {
    let user = repository::find_by_username(&state.db, &payload.identity).await
        .map_err(AppError::InternalServerError)?
        .ok_or(AppError::WrongCredentials)?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::InternalServerError(e.to_string()))?;

    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::WrongCredentials)?;

    let mut cookie = Cookie::new(AUTH_COOKIE_NAME, user.id.to_string());
    cookie.set_http_only(true);
    cookie.set_path("/");
    cookie.set_same_site(SameSite::Lax);
    cookie.set_max_age(Duration::days(30));
    
    let jar = jar.add(cookie);

    Ok((jar, AxumJson(user)))
}

pub async fn logout(
    jar: PrivateCookieJar<Key>,
) -> Result<(StatusCode, PrivateCookieJar<Key>), AppError> {
    let mut cookie = Cookie::new(AUTH_COOKIE_NAME, "");
    cookie.set_path("/");
    let jar = jar.remove(cookie);
    Ok((StatusCode::OK, jar))
}

pub async fn get_me(
    AuthUser(user): AuthUser,
) -> AxumJson<User> {
    AxumJson(user)
}

use axum::extract::Path;
use super::models::UpdateUserDto;

pub async fn update_user(
    State(state): State<AppState>,
    requester: AuthUser,
    Path(id): Path<i64>,
    AxumJson(payload): AxumJson<UpdateUserDto>,
) -> Result<AxumJson<User>, AppError> {
    // Check permission: Admin or Self
    if !requester.is_admin() && requester.0.id != id {
        return Err(AppError::Unauthorized("You can only modify your own account".to_string()));
    }

    // Role change is Admin Only
    if payload.role.is_some() && !requester.is_admin() {
        return Err(AppError::Unauthorized("Only admins can change roles".to_string()));
    }

    let user = repository::update(&state.db, id, payload)
        .await
        .map_err(|e| if e.contains("UNIQUE constraint") {
             AppError::Conflict("Username taken".to_string())
        } else {
             AppError::InternalServerError(e)
        })?;

    Ok(AxumJson(user))
}

pub async fn delete_user(
    State(state): State<AppState>,
    requester: AuthUser,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    // Check permission: Admin or Self
    if !requester.is_admin() && requester.0.id != id {
        return Err(AppError::Unauthorized("You can only delete your own account".to_string()));
    }

    repository::delete(&state.db, id)
        .await
        .map_err(AppError::InternalServerError)?;

    Ok(StatusCode::NO_CONTENT)
}
