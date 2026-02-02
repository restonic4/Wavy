#!/bin/bash

REPO_URL="https://github.com/restonic4/Wavy.git"
INSTALL_DIR="/root/Wavy"

BACKEND_SVC="wavy-backend.service"
BACKEND_SRC="installer/services/backend.service"

FRONTEND_SVC="wavy-frontend.service"
FRONTEND_SRC="installer/services/frontend.service"

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Dependency Check/Install
./dependencies.sh

# Clone or Update logic
if [ -d "$INSTALL_DIR" ]; then
    echo "Existing installation found. Pulling latest changes..."
    cd "$INSTALL_DIR" || exit
    git fetch --all
    git reset --hard origin/main
else
    echo "Installing Wavy for the first time..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR" || exit
fi

# Execute for both services
echo "Starting Service Synchronization"
./service.sh "$BACKEND_SVC" "$BACKEND_SRC"
./service.sh "$FRONTEND_SVC" "$FRONTEND_SRC"

echo
echo
echo "All Done! Enjoy Wavy!"