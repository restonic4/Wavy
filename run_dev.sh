#!/bin/bash

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
# Create dev data folders if they don't exist
DEV_DATA_DIR="$(pwd)/../dev_data"

echo "📂 Using Data Directory: $DEV_DATA_DIR"

# Change directory so CWD is correct for .env loading
cd backend || exit

# Run backend with custom environment variables for development
DATA_DIR="$DEV_DATA_DIR" \
DATABASE_URL="sqlite:$DEV_DATA_DIR/radio.db" \
cargo run < /dev/null &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo "🎨 Starting Frontend (Next.js)..."
# Change directory so CWD is correct for next.js
cd frontend || exit
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
