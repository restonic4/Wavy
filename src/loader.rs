use crate::config::{DATA_FOLDER, DEFAULT_SAMPLE_RATE, SAMPLES_PER_FRAME};
use crate::state::{AppState, AudioFrame, SongMetadata};
use bytes::Bytes;
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use tokio::sync::mpsc;

pub fn start(tx: mpsc::Sender<AudioFrame>, state: Arc<AppState>) {
    // Spawn as a Tokio task instead of a regular thread
    tokio::spawn(async move {
        let mut global_song_id = 0u64;

        loop {
            let mut files = get_mp3_files(DATA_FOLDER);
            if files.is_empty() {
                tracing::warn!("No MP3 files found in {}", DATA_FOLDER);
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }

            // Shuffle in a blocking context to avoid Send issues
            tokio::task::block_in_place(|| {
                use rand::seq::SliceRandom;
                files.shuffle(&mut rand::thread_rng());
            });

            for file_path in files {
                global_song_id += 1;

                tracing::info!("🎵 Loading song #{}: {:?}", global_song_id, file_path);

                // Run the blocking file I/O in a blocking task
                let tx_clone = tx.clone();
                let state_clone = state.clone();
                let path = file_path.clone();

                let result = tokio::task::spawn_blocking(move || {
                    stream_mp3_file(&path, &tx_clone, global_song_id, &state_clone)
                }).await;

                match result {
                    Ok(Ok(_)) => tracing::info!("✓ Finished song #{}", global_song_id),
                    Ok(Err(e)) => tracing::error!("✗ Error streaming {}: {}", file_path.display(), e),
                    Err(e) => tracing::error!("✗ Task error: {}", e),
                }
            }
        }
    });
}

fn get_mp3_files(path: &str) -> Vec<PathBuf> {
    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                // Accept common audio formats
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if matches!(ext_str.as_str(), "mp3" | "m4a" | "mp4" | "aac" | "flac" | "ogg" | "wav") {
                        files.push(path);
                    }
                }
            }
        }
    }
    files
}

fn stream_mp3_file(
    path: &Path,
    tx: &mpsc::Sender<AudioFrame>,
    song_id: u64,
    state: &Arc<AppState>,
) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| format!("File open error: {}", e))?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    // Add hint based on file extension
    if let Some(ext) = path.extension() {
        hint.with_extension(&ext.to_string_lossy());
    }

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    let mut probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| {
            // Provide helpful error message
            let ext = path.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("unknown");
            format!("Failed to probe file (extension: {}): {}. This file may be corrupt or not a valid audio file.", ext, e)
        })?;

    let mut format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .ok_or("No audio track found")?;

    let track_id = track.id;
    let codec_params = &track.codec_params;

    // --- STRICT GUARD: Check Sample Rate ---
    // We use unwrap_or(0) here to ensure we don't accidentally default to 44100
    // if the metadata is missing, catching "unknown" rates as errors too.
    let sample_rate = codec_params.sample_rate.unwrap_or(0);

    if sample_rate != DEFAULT_SAMPLE_RATE {
        let filename = path.file_name().unwrap_or_default().to_string_lossy();
        tracing::warn!(
            "⏭️  Skipping '{}': Sample Rate mismatch. Found {}Hz, required {}Hz.",
            filename,
            sample_rate,
            DEFAULT_SAMPLE_RATE
        );
        // Returning Ok(()) finishes this function cleanly, allowing the loop
        // in start() to proceed to the next file immediately.
        return Ok(());
    }
    // ---------------------------------------

    let duration_secs = codec_params
        .n_frames
        .map(|frames| (frames as f64 * SAMPLES_PER_FRAME as f64) / sample_rate as f64)
        .unwrap_or(180.0);

    let mut title = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let mut artist: Option<String> = None;

    // Try to extract metadata from the probed metadata
    if let Some(metadata_rev) = probed.metadata.get() {
        if let Some(rev) = metadata_rev.current() {
            for tag in rev.tags() {
                match tag.std_key {
                    Some(symphonia::core::meta::StandardTagKey::TrackTitle) => {
                        title = tag.value.to_string();
                    }
                    Some(symphonia::core::meta::StandardTagKey::Artist) => {
                        artist = Some(tag.value.to_string());
                    }
                    _ => {}
                }
            }
        }
    }

    tracing::info!(
        "  → {} @ {}Hz ({:.1}s)",
        title,
        sample_rate,
        duration_secs
    );

    // Update station metadata
    let metadata = SongMetadata {
        id: song_id,
        title: title.clone(),
        artist: artist.clone(),
        duration_seconds: duration_secs,
        started_at: Utc::now(),
        sample_rate,
    };

    // Update the station history - this is called from spawn_blocking so we need to spawn a task
    let state_clone = state.clone();
    tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(async {
            let mut station = state_clone.station.write().await;
            station.history.push_back(metadata);
            if station.history.len() > 10 {
                station.history.pop_front();
            }
        })
    });

    // Create decoder
    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &dec_opts)
        .map_err(|e| format!("Decoder error: {}", e))?;

    // Stream packets
    let mut frame_count = 0;
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(symphonia::core::errors::Error::IoError(e))
            if e.kind() == std::io::ErrorKind::UnexpectedEof =>
                {
                    break;
                }
            Err(e) => {
                tracing::warn!("Packet read error: {}", e);
                break;
            }
        };

        if packet.track_id() != track_id {
            continue;
        }

        // Decode to get actual sample count and validate
        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("Decode error: {}", e);
                continue;
            }
        };

        // Calculate precise duration from decoded audio buffer
        // This handles MPEG1 (1152 samples) and MPEG2/2.5 (576 samples) correctly
        let frame_samples = decoded.capacity() as u64;
        let frame_duration = Duration::from_secs_f64(
            frame_samples as f64 / sample_rate as f64
        );

        // Send the raw packet data (this is the encoded MP3 frame)
        let frame_data = Bytes::copy_from_slice(packet.buf());

        let audio_frame = AudioFrame {
            data: frame_data,
            duration: frame_duration,
        };

        if tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                tx.send(audio_frame).await
            })
        }).is_err() {
            return Err("Channel closed".to_string());
        }

        frame_count += 1;
    }

    tracing::info!("  → Sent {} frames", frame_count);
    Ok(())
}