#!/bin/sh
# POSIX-compliant startup script

echo "🚀 Starting Flowcomments..."

UPLOAD_DIR="${FLOWCOMMENTS_UPLOAD_DIR:-/app/data/uploads}"
mkdir -p "$UPLOAD_DIR" 2>/dev/null || true
echo "📁 Media uploads: $UPLOAD_DIR"

# Run migrations (failure is fatal, with light recovery for known P3009)
echo "📦 Running database migrations..."
MIGRATE_LOG="$(mktemp)"
recover_failed_migration() {
  migration_name="$1"
  ensure_sql="$2"
  echo "⚠️  Recovering failed migration: $migration_name"
  if [ -n "$ensure_sql" ]; then
    printf '%s\n' "$ensure_sql" | npx prisma db execute --stdin || true
  fi
  if npx prisma migrate resolve --applied "$migration_name"; then
    if npx prisma migrate deploy; then
      echo "✅ Migrations recovered ($migration_name)"
      return 0
    fi
  fi
  return 1
}

if ! npx prisma migrate deploy >"$MIGRATE_LOG" 2>&1; then
  cat "$MIGRATE_LOG"
  recovered=0
  if grep -q "P3009" "$MIGRATE_LOG"; then
    if grep -q "20261115020000_ig_profile_picture" "$MIGRATE_LOG"; then
      if recover_failed_migration \
        "20261115020000_ig_profile_picture" \
        'ALTER TABLE "InstagramAccount" ADD COLUMN IF NOT EXISTS "profilePictureUrl" TEXT;'; then
        recovered=1
      fi
    elif grep -q "20261111193000_user_timezone" "$MIGRATE_LOG"; then
      if recover_failed_migration "20261111193000_user_timezone" ""; then
        recovered=1
      fi
    fi
  fi
  rm -f "$MIGRATE_LOG"
  if [ "$recovered" -ne 1 ]; then
    echo "❌ Migration failed"
    exit 1
  fi
else
  cat "$MIGRATE_LOG"
  rm -f "$MIGRATE_LOG"
  echo "✅ Migrations complete"
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
