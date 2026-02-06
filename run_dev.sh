#!/bin/bash

# Load NVM if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! npm -v; then
    echo "npm not found"
    exit
fi

if ! command -v npm &> /dev/null; then
    # This tries to locate the npm binary path dynamically
    DYNAMIC_NPM=$(type -p npm || which npm 2>/dev/null)
    if [ -n "$DYNAMIC_NPM" ]; then
        export PATH="$(dirname "$DYNAMIC_NPM"):$PATH"
    fi
fi

# Function to kill specific background processes
cleanup() {
    echo ""
    echo "🛑 Stopping dev servers..."
    
    if [ -n "$BACKEND_PID" ]; then
        echo "Killing Backend (PID $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo "Killing Frontend (PID $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM using the cleanup function
trap cleanup SIGINT SIGTERM

echo "🚀 Starting Wavy Development Environment..."

# Start Backend
echo "📦 Starting Backend (Rust)..."
# Ensure ~/.cargo/bin is in PATH so the script can find 'sqlx' and 'cargo'
export PATH="$HOME/.cargo/bin:$PATH"

# Create dev data folder if it doesn't exist
DEV_DATA_DIR="$(pwd)/dev_data"
mkdir -p "$DEV_DATA_DIR"

echo "📂 Using Data Directory: $DEV_DATA_DIR"

# Set environment variables using the absolute path
export DATA_DIR="$DEV_DATA_DIR"
export DATABASE_URL="sqlite:$DEV_DATA_DIR/radio.db"

# Change directory so CWD is correct for backend operations
cd backend || exit

# Database Setup
if [ ! -f "$DEV_DATA_DIR/radio.db" ]; then
    echo "🗄️ Database not found. Creating $DEV_DATA_DIR/radio.db..."
    # Explicitly pass the URL to ensure it reaches the right folder
    sqlx database create --database-url "sqlite:$DEV_DATA_DIR/radio.db"
fi

echo "🔄 Running migrations..."
sqlx migrate run --database-url "sqlite:$DEV_DATA_DIR/radio.db"

# Run backend
cargo run < /dev/null &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo "🎨 Starting Frontend (Next.js)..."
# Change directory so CWD is correct for next.js
cd frontend || exit
npm install
npm run dev < /dev/null &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers running!"
echo "   - Backend PID: $BACKEND_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
