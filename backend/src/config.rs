use std::env;
use std::path::PathBuf;

fn ensure_exists(path: PathBuf) -> PathBuf {
    if !path.exists() {
        let _ = std::fs::create_dir_all(&path);
    }
    path
}

pub fn get_data_dir() -> PathBuf {
    let path = env::var("DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    
    ensure_exists(path)
}

pub fn get_music_dir() -> PathBuf {
    ensure_exists(get_data_dir().join("music"))
}

pub fn get_covers_dir() -> PathBuf {
    ensure_exists(get_data_dir().join("covers"))
}

pub fn get_temporal_dir() -> PathBuf {
    ensure_exists(get_data_dir().join("temporal"))
}

pub fn get_save_dat_path() -> PathBuf {
    get_data_dir().join("save.dat")
}

// How many seconds of audio to buffer for burst (catch-up buffer for new clients)
pub const BURST_BUFFER_SECONDS: f64 = 3.0;

// MP3 Frame constants
// Most MP3s are 44.1kHz, 1152 samples per frame = ~26ms per frame
pub const SAMPLES_PER_FRAME: u32 = 1152;
pub const DEFAULT_SAMPLE_RATE: u32 = 44100;

// Channel buffer sizes (in frames, not bytes)
// At 26ms per frame: 100 frames = ~2.6 seconds
pub const DISK_BUFFER_FRAMES: usize = 200;
pub const BROADCAST_BUFFER_FRAMES: usize = 200;