# Wavy Radio v2.0 - Fixed Version

## What Was Wrong (and How It's Fixed)

### 🐛 Problem 1: Album Art & Metadata Bloat
**Old Code:** Read raw MP3 file bytes in 4KB chunks, including album art and metadata
**Why It Failed:** First ~200KB of most MP3s is non-audio data (ID3 tags, album art). This caused:
- Massive initial buffer that never played
- Wrong timing calculations (you thought 4KB = 250ms, but it was random metadata)
- Clients waiting 5+ seconds before hearing anything

**Fix:** Use Symphonia library to:
- Parse MP3 container format properly
- Skip all metadata/album art
- Extract only encoded audio frames
- Each frame is a proper MP3 audio frame (usually 417-1152 bytes)

### 🐛 Problem 2: Wrong Bitrate Math
**Old Code:**
```rust
let bytes_per_sec = (bitrate_kbps as f64 * 1000.0) / 8.0;
```
**Why It Failed:** MP3 bitrate is ALREADY in kilobits per second. You were converting it twice!
- 320kbps MP3 → you calculated 40KB/s → created 0.1s chunks
- Reality: frames are variable size, need frame-level timing

**Fix:** Calculate duration per actual audio frame:
```rust
let frame_duration = Duration::from_secs_f64(SAMPLES_PER_FRAME as f64 / sample_rate as f64);
// For 44.1kHz: 1152 samples / 44100 = 26.12ms per frame
```

### 🐛 Problem 3: No Frame Synchronization
**Old Code:** Cut file into arbitrary 4KB chunks
**Why It Failed:** MP3 decoders need complete frames. You were sending half-frames, causing:
- Decoder errors
- Audio glitches
- Unpredictable timing

**Fix:** Symphonia gives us complete, valid MP3 frames that decoders can handle

### 🐛 Problem 4: Burst Mode Hack
**Old Code:** Send first 64 chunks with Duration::ZERO
**Why It Failed:** This just flooded the buffer faster with the same broken data

**Fix:** Proper time-based buffer (3 seconds of ACTUAL audio frames)

### 🐛 Problem 5: Timing Drift
**Old Code:** Sleep after sending each chunk
**Why It Failed:** Accumulated error from processing time, network jitter

**Fix:** Absolute timing with Tokio's `sleep_until`:
```rust
next_send_time += frame.duration;
tokio::time::sleep_until(next_send_time).await;
```

## Architecture

```
┌─────────────┐
│   Loader    │ (Thread)
│             │ - Reads MP3 files
│             │ - Uses Symphonia to parse
│             │ - Extracts audio frames
│             │ - Sends to channel
└──────┬──────┘
       │ AudioFrame { data: Bytes, duration: Duration }
       ▼
┌─────────────┐
│ Broadcaster │ (Async Task)
│             │ - Receives frames
│             │ - Sends to live listeners
│             │ - Maintains 3s buffer
│             │ - Precise timing control
└──────┬──────┘
       │ Broadcasts AudioFrame
       ▼
┌─────────────┐
│  Listeners  │ (HTTP Streams)
│             │ - Get burst buffer first
│             │ - Then receive live frames
│             │ - Browser decodes & plays
└─────────────┘
```

## Setup

1. **Install Rust** (if not already):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Create project structure**:
```bash
mkdir -p wavy-radio/src
cd wavy-radio
# Copy all the files from above into their correct locations
```

3. **Add MP3 files**:
```bash
mkdir data
# Put your .mp3 files in the data/ folder
```

4. **Build and run**:
```bash
cargo build --release
./target/release/wavy
```

5. **Open browser**: http://localhost:3000

## Expected Behavior

✅ **First connection**:
- Receives ~3 seconds of buffered audio instantly
- Starts playing within 1-2 seconds
- Smooth playback

✅ **Synchronization**:
- All clients hear the same audio within ±0.5 seconds
- Drift display shows small values (< 1 second)
- No accumulated delay over time

✅ **Song transitions**:
- Clean transitions between songs
- Metadata updates correctly
- No gaps or stutters

## Monitoring

The web interface shows:
- **Drift**: How far behind/ahead each listener is (should be < 1s)
- **Song History**: Last 10 songs with accurate timing
- **Live Listeners**: Who's connected and what they're hearing

Positive drift = user is behind (normal due to 3s buffer)
Negative drift = user is ahead (shouldn't happen)

## Performance Notes

- Each MP3 frame is ~26ms of audio (for 44.1kHz)
- Buffer holds ~115 frames (3 seconds)
- Broadcast channel can handle ~200 frames before lag
- Server CPU usage is minimal (just frame forwarding)

## Troubleshooting

**"No songs playing"**: Check that `data/` folder has .mp3 files

**"High drift" (> 2 seconds)**:
- Check network quality
- Try reducing BURST_BUFFER_SECONDS to 2.0

**"Audio cuts out"**:
- Check server logs for "behind schedule" warnings
- Increase BROADCAST_BUFFER_FRAMES if needed

**"Can't hear anything"**:
- Check browser console for errors
- Ensure audio element has permission to play
- Try clicking the play button manually

## Technical Details

### Frame Timing
- Most MP3s: 44.1kHz sample rate, 1152 samples/frame
- Frame duration: 1152 / 44100 = 26.12ms
- Variable bitrate files work correctly (each frame gets individual timing)

### Buffer Management
- History buffer: time-based (3 seconds default)
- Automatically trims old frames
- New joiners get consistent experience

### Drift Calculation
```
user_audio_position = connect_time + played_seconds - buffer_seconds
drift = now - user_audio_position
```

Positive drift = user is behind (expected ~3 seconds due to buffer)
Values > 5s indicate network/processing issues

## What's Different from v1?

| Aspect | Old (Broken) | New (Fixed) |
|--------|-------------|-------------|
| **Chunking** | Arbitrary 4KB chunks | MP3 audio frames |
| **Metadata** | Included in stream | Stripped, only metadata used |
| **Timing** | Estimated from bitrate | Precise per-frame duration |
| **Sync** | Accumulated drift | Absolute time tracking |
| **Buffer** | Packet count | Time-based (seconds) |
| **Library** | lofty (metadata only) | symphonia (full parsing) |

## License

MIT - Do whatever you want with it!

## db create

sqlx database create --database-url "sqlite:radio.db"

sqlx migrate run --database-url "sqlite:radio.db"


- Reproducir musica
- Playlists
- Radios (por ejemplo, una radio podria ser programable, tipo, que a ciertas horas pone x tipo de musica y en otras otra, o que tambien vaya por estaciones, que cuando se acerca navidad cada vez son mas navideñas) (podria ir como con atributos, como "navideña" y tenga puntuacion unica, osea, que en un menu me vayan saliendo las canciones y me ponga dos y me pide elegir cual es mas navideña)

La cosa es que a lo mejor quiero escuchar una radio de estas de estacion o por hora, pero claro, a lo mejor quiero algo energetico, o algo de chill, o algo de fondo, o algo de nintendo o de un juego en concreto