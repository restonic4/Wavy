pub const DATA_FOLDER: &str = "data";

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