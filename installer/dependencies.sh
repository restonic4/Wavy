#!/bin/bash

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Ask user to continue, this will update the system and install deps
printf "Do you want to update the system and install required dependencies? (y/n): "
read answer

case "$answer" in
  y|Y|yes|YES)
    echo "Continuing..."
    ;;
  n|N|no|NO)
    echo "Check instructions on how to manually install Wavy. This is the easy/auto setup."
    echo "Quick instructions:"
    echo
    echo "If this is outdated, please feel free to open an issue on github!"
    echo
    echo "1. Clone this repo"
    echo "2. You will need some dependencies to make all run, depending of the side you want to run. (backend / frontend) (detailed on the readme) (yes, you are able to only run the backend with no frontend and make your own)"
    echo "3. Check on installer/services/ here we have services for the backend and frontend"
    exit 1
    ;;
  *)
    echo "Invalid input. Please answer yes or no."
    exit 1
    ;;
esac

sudo apt update

if ! command -v git &> /dev/null; then
    echo "Git not found. Installing..."
    apt-get install -y git
fi

## Check for System Dependencies (SQLite development files)
if ! dpkg -s libsqlite3-dev pkg-config >/dev/null 2>&1; then
    echo "Installing system dependencies (sqlite3 and pkg-config)..."
    sudo apt install -y libsqlite3-dev pkg-config build-essential
else
    echo "System dependencies found."
fi

## Rust, cargo
if ! command -v cargo >/dev/null 2>&1; then
    echo "Rust not found. Installing via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "Rust/Cargo found: $(cargo --version)"
fi

## SQLx CLI
if ! command -v sqlx >/dev/null 2>&1; then
    echo "sqlx-cli not found. Installing with SQLite support..."
    cargo install sqlx-cli --no-default-features --features native-tls,sqlite
else
    echo "sqlx-cli found: $(sqlx --version)"
fi

## Node.js (Using Nodesource for the latest LTS)
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not found. Installing Node.js 20.x (LTS)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js found: $(node -v)"
fi