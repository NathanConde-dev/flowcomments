#!/bin/bash
set -e

echo "🚀 Starting Flowcomments..."

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check if we should run worker in same process
if [ "$RUN_WORKER" != "false" ]; then
  echo "🔧 Starting worker in background..."
  node -r tsx/register worker/index.ts &
  WORKER_PID=$!
fi

# Start web server
echo "🌐 Starting web server on port ${PORT:-3000}..."
node server.js &
WEB_PID=$!

# Handle shutdown
trap "kill $WEB_PID $WORKER_PID 2>/dev/null" EXIT INT TERM

# Wait for processes
wait $WEB_PID
