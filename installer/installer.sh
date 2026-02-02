#!/bin/bash

REPO_URL="https://github.com/restonic4/Wavy.git"
INSTALL_DIR="/root/Wavy"

# Define your service names and their paths relative to the repo root
BACKEND_SVC="wavy-backend.service"
BACKEND_SRC="services/backend.service"

FRONTEND_SVC="wavy-frontend.service"
FRONTEND_SRC="services/frontend.service"

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run as root (use sudo)."
  exit 1
fi

# 2. Dependency Check
if ! command -v git &> /dev/null; then
    echo "📦 Git not found. Installing..."
    apt-get update && apt-get install -y git
fi

# 3. Clone or Update logic
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 Existing installation found. Pulling latest changes..."
    cd "$INSTALL_DIR" || exit
    git fetch --all
    git reset --hard origin/main
else
    echo "🚀 Installing Wavy for the first time..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR" || exit
fi

# 4. Define a function to handle service updates
update_systemd_service() {
    local SERVICE_NAME=$1
    local SOURCE_PATH="$INSTALL_DIR/$2"
    local TARGET_PATH="/etc/systemd/system/$SERVICE_NAME"

    if [ -f "$SOURCE_PATH" ]; then
        echo "⚙️  Configuring $SERVICE_NAME..."
        cp "$SOURCE_PATH" "$TARGET_PATH"
        chmod 644 "$TARGET_PATH"

        systemctl daemon-reload
        systemctl enable "$SERVICE_NAME"
        systemctl restart "$SERVICE_NAME"
        echo "✅ $SERVICE_NAME is up and running."
    else
        echo "⚠️  Warning: Service file $SOURCE_PATH not found. Skipping."
    fi
}

# 5. Execute for both services
echo "--- Starting Service Synchronization ---"
update_systemd_service "$BACKEND_SVC" "$BACKEND_SRC"
update_systemd_service "$FRONTEND_SVC" "$FRONTEND_SRC"

echo "--- 🥂 All Done! ---"
# Show a summary of statuses
systemctl status "$BACKEND_SVC" "$FRONTEND_SVC" --no-pager -l