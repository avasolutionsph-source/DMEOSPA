#!/bin/bash

echo "Starting Ava Solutions Development Environment..."
echo ""

echo "[1/3] Starting PWA Backend on port 4000..."
cd pwa-backend && npm run dev &
BACKEND_PID=$!
cd ..
sleep 3

echo "[2/3] Starting Marketing Website on port 3000..."
cd marketing-website && npm run dev &
WEBSITE_PID=$!
cd ..
sleep 3

echo "[3/3] Starting PWA on port 8080..."
npx http-server -p 8080 -c-1 &
PWA_PID=$!
sleep 2

echo ""
echo "================================"
echo "Development Environment Started!"
echo "================================"
echo "PWA Backend:      http://localhost:4000/api/health"
echo "Marketing Site:   http://localhost:3000"
echo "PWA Application:  http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $BACKEND_PID $WEBSITE_PID $PWA_PID 2>/dev/null
    echo "All services stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Wait for user to stop
wait
