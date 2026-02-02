#!/bin/bash

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Check if both arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <service_name.service> <source_file_path>"
    exit 1
fi

SERVICE_NAME=$1
SOURCE_FILE=$2
TARGET_PATH="/etc/systemd/system/$SERVICE_NAME"

# Check if the source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file '$SOURCE_FILE' not found."
    exit 1
fi

# Find the node executable in the current environment
NODE_EXEC=$(command -v node)

if [ -z "$NODE_EXEC" ]; then
    echo "Error: 'node' command not found. Please ensure node is in the PATH."
    exit 1
fi

# Get the directory of the executable (e.g., /root/.nvm/.../bin)
NODE_BIN_DIR=$(dirname "$NODE_EXEC")
echo "Detected Node.js bin directory: $NODE_BIN_DIR"

echo "Updating service: $SERVICE_NAME..."

# Copy/Replace the service file
cp "$SOURCE_FILE" "$TARGET_PATH"
sed -i "s|\${NODE_BIN}|$NODE_BIN_DIR|g" "$TARGET_PATH"
chmod 644 "$TARGET_PATH"

# Reload systemd to recognize the changes
systemctl daemon-reload

# Enable the service
systemctl enable "$SERVICE_NAME"

# Restart the service to apply the new configuration
systemctl restart "$SERVICE_NAME"

echo "Success! $SERVICE_NAME has been updated and restarted."
systemctl status "$SERVICE_NAME" --no-pager