#!/bin/sh
# POSIX-compliant startup script

echo "🚀 Starting Flowcomments..."

# Run migrations (failure is fatal)
echo "📦 Running database migrations..."
if ! npx prisma migrate deploy; then
  echo "❌ Migration failed"
  exit 1
fi

# Start web server (main process)
echo "🌐 Starting web server on port ${PORT:-8080}..."
node server.js &
WEB_PID=$!

# Start worker in background if REDIS_URL is set
# Worker failures should NOT kill the web server
if [ "${RUN_WORKER}" != "false" ] && [ -n "${REDIS_URL}" ]; then
  echo "🔧 Starting worker..."
  (
    while true; do
      echo "Starting worker process..."
      npx tsx worker/index.ts
      WORKER_EXIT=$?
      if [ $WORKER_EXIT -eq 0 ]; then
        echo "Worker exited cleanly"
        break
      else
        echo "⚠️  Worker crashed (exit $WORKER_EXIT), restarting in 5s..."
        sleep 5
      fi
    done
  ) &
  WORKER_PID=$!
fi

# Graceful shutdown handler
cleanup() {
  echo "Shutting down..."
  if [ -n "$WORKER_PID" ]; then
    kill "$WORKER_PID" 2>/dev/null || true
  fi
  if [ -n "$WEB_PID" ]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup INT TERM

# Wait for web server (main process)
wait $WEB_PID
