use crate::config::DEFAULT_SAMPLE_RATE;
use crate::state::{AppState, AudioFrame, StreamMessage};
use bytes::Bytes;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use tokio::sync::mpsc;
use crate::orm::songs::models::Song;

pub fn start(tx: mpsc::Sender<StreamMessage>, state: Arc<AppState>) {
    tokio::spawn(async move {
        loop {
            let songs = match crate::orm::songs::repository::find_all(&state.db).await {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("Failed to fetch songs from DB: {}", e);
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    continue;
                }
            };

            if songs.is_empty() {
                tracing::warn!("No songs found in database!");
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }

            // Shuffle songs
            let mut play_list = songs;
            tokio::task::block_in_place(|| {
                use rand::seq::SliceRandom;
                play_list.shuffle(&mut rand::rng());
            });

            for song_data in play_list {
                let file_path = crate::config::get_music_dir().join(format!("{}.mp3", song_data.id));

                if !file_path.exists() {
                    tracing::warn!("Song #{} ({}) exists in DB but file not found at {:?}", song_data.id, song_data.title, file_path);
                    continue;
                }

                tracing::info!("Loading song #{}: {} by {:?}", song_data.id, song_data.title, song_data.artist_names);

                let tx_clone = tx.clone();
                let state_clone = state.clone();
                let path = file_path.clone();

                let result = tokio::task::spawn_blocking(move || {
                    stream_mp3_file(&path, &tx_clone, song_data, &state_clone)
                }).await;

                match result {
                    Ok(Ok(_)) => {}
                    Ok(Err(e)) => tracing::error!("Error streaming: {}", e),
                    Err(e) => tracing::error!("Task error: {}", e),
                }
            }
        }
    });
}

fn stream_mp3_file(
    path: &Path,
    tx: &mpsc::Sender<StreamMessage>,
    db_song: Song,
    _state: &Arc<AppState>,
) -> Result<(), String> {
    let file = std::fs::File::open(path).map_err(|e| format!("File open error: {}", e))?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    hint.with_extension("mp3");

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| format!("Failed to probe file: {}", e))?;

    let mut format = probed.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != symphonia::core::codecs::CODEC_TYPE_NULL)
        .ok_or("No audio track found")?;

    let track_id = track.id;
    let codec_params = &track.codec_params;
    let sample_rate = codec_params.sample_rate.unwrap_or(0);

    if sample_rate != DEFAULT_SAMPLE_RATE {
        tracing::warn!("Skipping {}: Sample Rate mismatch ({}Hz)", db_song.title, sample_rate);
        return Ok(());
    }

    /*let duration_secs = codec_params
        .n_frames
        .map(|frames| (frames as f64 * SAMPLES_PER_FRAME as f64) / sample_rate as f64)
        .unwrap_or(180.0);*/

    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &dec_opts)
        .map_err(|e| format!("Decoder error: {}", e))?;

    // Load rhythm data (save.dat) if present
    let rhythm_data = std::fs::read(crate::config::get_save_dat_path()).ok();

    let duration_ms = if let Some(n_frames) = codec_params.n_frames {
        // This is an approximation for MP3, but usually accurate enough for progress bars
        (n_frames as f64 / sample_rate as f64 * 1000.0) as u64
    } else {
        0
    };

    // Send SongStart event before first frame
    if tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(async {
            tx.send(StreamMessage::SongStart(db_song.clone(), duration_ms, rhythm_data)).await
        })
    }).is_err() {
        return Err("Channel closed".to_string());
    }

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(symphonia::core::errors::Error::IoError(e))
            if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => {
                tracing::warn!("Packet read error: {}", e);
                break;
            }
        };

        if packet.track_id() != track_id {
            continue;
        }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(e) => {
                tracing::warn!("Decode error: {}", e);
                continue;
            }
        };

        let frame_samples = decoded.capacity() as u64;
        let frame_duration = Duration::from_secs_f64(
            frame_samples as f64 / sample_rate as f64
        );

        let frame_data = Bytes::copy_from_slice(packet.buf());

        let audio_frame = AudioFrame {
            data: frame_data,
            duration: frame_duration,
        };

        if tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                tx.send(StreamMessage::Frame(audio_frame)).await
            })
        }).is_err() {
            return Err("Channel closed".to_string());
        }
    }

    Ok(())
}