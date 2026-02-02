#!/bin/bash

INPUT_FILE="$1"
OUTPUT_FILE="$2"

# Check if arguments are provided
if [ -z "$INPUT_FILE" ] || [ -z "$OUTPUT_FILE" ]; then
    echo "Usage: ./convert_audio.sh INPUT_FILE_PATH OUTPUT_FILE_PATH"
    exit 1
fi

# Run FFMPEG
# -i: Input file
# -vn: No video (removes album art to save bandwidth/prevent errors)
# -ar 44100: Set Audio Rate to 44.1kHz (Matches your Rust config)
# -ac 2: Set Audio Channels to 2 (Stereo - Browsers hate channel switching)
# -b:a 192k: Constant Bitrate 192kbps (Optional, but CBR is safer for streaming than VBR)
# -f mp3: Force container to MP3
# -y: Overwrite output file if exists
# -hide_banner -loglevel error: Suppress text output (only show errors)

ffmpeg -i "$INPUT_FILE" \
    -vn \
    -ar 44100 \
    -ac 2 \
    -b:a 192k \
    -f mp3 \
    -y \
    "$OUTPUT_FILE" > /dev/null 2>&1

# Check the exit code of the last command (ffmpeg)
if [ $? -eq 0 ]; then
    # Success
    exit 0
else
    # Failure
    exit 1
fi