#!/bin/bash

REPO_URL="https://github.com/restonic4/Wavy.git"
INSTALL_DIR="/var/www/Wavy"
DATA_DIR="/var/lib/Wavy"

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

# Data Directory Setup
if [ ! -d "$DATA_DIR" ]; then
    echo "Creating data directory at $DATA_DIR..."
    sudo mkdir -p "$DATA_DIR"
    
    # Set permissions so www-data (and current user) can write
    sudo chown -R $USER:www-data "$DATA_DIR"
    sudo chmod -R 775 "$DATA_DIR"
fi

# Dependency Check/Install
./installer/dependencies.sh

# Basic .env backend setup
echo "Setting up environment variables..."
cd "$INSTALL_DIR/backend" || exit
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating new .env file..."
    touch "$ENV_FILE"
fi

# Add DATA_DIR if it doesn't exist
if ! grep -q "DATA_DIR=" "$ENV_FILE"; then
    echo "Adding DATA_DIR to .env..."
    echo "DATA_DIR=$DATA_DIR" >> "$ENV_FILE"
fi

# Add DATABASE_URL if it doesn't exist (Updated to use absolute path)
if ! grep -q "DATABASE_URL=" "$ENV_FILE"; then
    echo "Adding DATABASE_URL to .env..."
    echo "DATABASE_URL=sqlite:$DATA_DIR/radio.db" >> "$ENV_FILE"
fi

# Add COOKIE_KEY if it doesn't exist
if ! grep -q "COOKIE_KEY=" "$ENV_FILE"; then
    echo "Generating secure COOKIE_KEY..."
    # Generate 64 bytes, base64 encode, and strip any potential newlines
    RANDOM_KEY=$(openssl rand -base64 64 | tr -d '\n\r')
    echo "COOKIE_KEY=$RANDOM_KEY" >> "$ENV_FILE"
    echo "Key generated and saved."
else
    echo "Existing COOKIE_KEY found in .env, skipping generation."
fi

# Backend build
echo "Building Rust Backend..."
cd "$INSTALL_DIR/backend" || exit

# Database Setup
# Note: sqlx will use the DATABASE_URL from .env
if [ ! -f "$DATA_DIR/radio.db" ]; then
    echo "Database not found. Creating radio.db at $DATA_DIR..."
    sqlx database create
fi
echo "Running migrations..."
sqlx migrate run

# Build the release binary
cargo build --release

# Frontend build
echo "Building Frontend..."
cd "$INSTALL_DIR/frontend" || exit

# Assuming you use npm, change to pnpm/yarn if needed
npm install
npm run build

# Exit
cd "$INSTALL_DIR" || exit

# Execute for both services
echo "Starting Service Synchronization"
./installer/service.sh "$BACKEND_SVC" "$BACKEND_SRC"
./installer/service.sh "$FRONTEND_SVC" "$FRONTEND_SRC"

echo
echo
echo
echo "------------------------------------------------------"
echo "Current status: Services are running locally."
echo "Note: The application is NOT yet accessible to the public."
echo "You will need an Nginx reverse proxy to expose Wavy to the web."
echo "------------------------------------------------------"
echo
echo
echo

# Ask user if they want to configure Nginx
echo -n "Would you like to run the Nginx setup script now? (y/n): "
read -r answer < /dev/tty

if [[ "$answer" =~ ^[Yy]$ ]]; then
    echo "Starting Nginx configuration..."
    ./installer/nginx.sh
fi

echo
echo
echo
echo "All Done! Enjoy Wavy!"