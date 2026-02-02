#!/bin/bash

REPO_URL="https://github.com/restonic4/Wavy.git"
INSTALL_DIR="/var/www/Wavy"

BACKEND_SVC="wavy-backend.service"
BACKEND_SRC="installer/services/backend.service"

FRONTEND_SVC="wavy-frontend.service"
FRONTEND_SRC="installer/services/frontend.service"

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Stop services if found
SERVICES=("$BACKEND_SVC" "$FRONTEND_SVC")
for SVC in "${SERVICES[@]}"; do
    echo "Checking $SVC"

    # CHECK IF SYSTEMCTL EXISTS
    if ! command -v systemctl &> /dev/null; then
        echo "systemctl command not found. Skipping service check for $SVC (Running in Docker?)"
        continue
    fi

    # Check if the service exists
    if systemctl list-unit-files "$SVC" | grep -q "$SVC"; then

        # Check if it's actually running
        if systemctl is-active --quiet "$SVC"; then
            echo "Stopping $SVC..."
            sudo systemctl stop "$SVC"

            # Double check it actually stopped
            if [ $? -eq 0 ]; then
                echo "$SVC stopped successfully."
            else
                echo "Failed to stop $SVC."
            fi
        else
            echo "$SVC is already stopped."
        fi
    else
        echo "$SVC not found on this system."
    fi
done

# Clone or Update logic
if [ -d "$INSTALL_DIR" ]; then
    echo "Existing installation found. Pulling latest changes..."
    cd "$INSTALL_DIR" || exit
    git fetch --all
    git reset --hard origin/main
else
    echo "Installing Wavy for the first time..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    sudo chown -R $USER:www-data "$INSTALL_DIR"
    sudo chmod -R 775 "$INSTALL_DIR"
    cd "$INSTALL_DIR" || exit
fi

# Dependency Check/Install
./dependencies.sh

# Execute for both services
echo "Starting Service Synchronization"
./service.sh "$BACKEND_SVC" "$BACKEND_SRC"
./service.sh "$FRONTEND_SVC" "$FRONTEND_SRC"

echo
echo "All Done! Enjoy Wavy!"