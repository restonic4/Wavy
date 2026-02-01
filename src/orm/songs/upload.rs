use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use tokio::fs;
use tokio::process::Command;
use std::path::PathBuf;
use axum_extra::extract::Multipart;
use crate::state::AppState;
use crate::error::AppError;
use crate::auth::AdminOnly;
use super::models::{Song, CreateSongDto};
use super::repository;

#[derive(serde::Serialize)]
pub struct UploadResponse {
    pub song_id: i64,
    pub message: String,
}

pub async fn upload_song(
    State(state): State<AppState>,
    _admin: AdminOnly,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<UploadResponse>), AppError> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut image_data: Option<Vec<u8>> = None;
    let mut title: Option<String> = None;
    let mut album_id: Option<i64> = None;
    let mut artist_ids: Vec<i64> = Vec::new();

    // Parse multipart form data
    while let Some(field) = multipart.next_field().await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))? 
    {
        let name = field.name().unwrap_or("").to_string();
        
        match name.as_str() {
            "file" => {
                let data = field.bytes().await
                    .map_err(|e| AppError::BadRequest(format!("Failed to read file: {}", e)))?;
                file_data = Some(data.to_vec());
            }
            "image" => {
                let data = field.bytes().await
                    .map_err(|e| AppError::BadRequest(format!("Failed to read image: {}", e)))?;
                image_data = Some(data.to_vec());
            }
            "title" => {
                let text = field.text().await
                    .map_err(|e| AppError::BadRequest(format!("Failed to read title: {}", e)))?;
                title = Some(text);
            }
            "album_id" => {
                let text = field.text().await
                    .map_err(|e| AppError::BadRequest(format!("Failed to read album_id: {}", e)))?;
                if !text.is_empty() {
                    album_id = text.parse::<i64>().ok();
                }
            }
            "artist_id" | "artist_ids" => {
                let text = field.text().await
                    .map_err(|e| AppError::BadRequest(format!("Failed to read artist_id: {}", e)))?;
                if !text.is_empty() {
                    // Support comma separated or multiple fields
                    for part in text.split(',') {
                        if let Ok(id) = part.trim().parse::<i64>() {
                            artist_ids.push(id);
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Validate required fields
    let file_data = file_data.ok_or(AppError::BadRequest("No file provided".to_string()))?;
    let title = title.ok_or(AppError::BadRequest("No title provided".to_string()))?;

    // Create song entry in database first to get ID
    let song = repository::create(&state.db, CreateSongDto {
        title: title.clone(),
        album_id,
        artist_ids: if artist_ids.is_empty() { None } else { Some(artist_ids) },
    })
    .await
    .map_err(AppError::InternalServerError)?;

    let song_id = song.id;

    // Define paths
    let raw_path = PathBuf::from(format!("raw_songs/{}.raw", song_id));
    let final_path = PathBuf::from(format!("data/{}.mp3", song_id));

    // Save raw file
    fs::write(&raw_path, &file_data)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to save raw file: {}", e)))?;

    // Run conversion script
    let output = Command::new("./convert.sh")
        .arg(&raw_path)
        .arg(&final_path)
        .output()
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to run convert script: {}", e)))?;

    if !output.status.success() {
        // Clean up on failure
        let _ = fs::remove_file(&raw_path).await;
        let _ = repository::delete(&state.db, song_id).await;
        
        return Err(AppError::InternalServerError(
            format!("Conversion failed: {}", String::from_utf8_lossy(&output.stderr))
        ));
    }

    // Clean up raw file after successful conversion
    let _ = fs::remove_file(&raw_path).await;

    // Handle image if provided
    if let Some(img_data) = image_data {
        let img_path = PathBuf::from(format!("data/{}.png", song_id)); // Defaulting to png for now, or we could detect
        if let Ok(_) = fs::write(&img_path, &img_data).await {
            let _ = repository::set_has_image(&state.db, song_id, true).await;
        }
    }

    Ok((StatusCode::CREATED, Json(UploadResponse {
        song_id,
        message: format!("Song '{}' uploaded successfully", title),
    })))
}
