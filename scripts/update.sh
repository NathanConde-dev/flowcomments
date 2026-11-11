#!/usr/bin/env sh
# Safe opt-in updater for Flowcomments (VPS / docker compose host).
# Does NOT delete .env, volumes, or automation data.
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

mkdir -p tmp
LOG_FILE="$ROOT_DIR/tmp/update.log"
exec >>"$LOG_FILE" 2>&1

echo "==== Flowcomments update $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a
  . ./.env
  set +a
fi

MODE="${FLOWCOMMENTS_UPDATE_MODE:-auto}"

detect_mode() {
  if [ "$MODE" != "auto" ]; then
    echo "$MODE"
    return
  fi
  if [ -f docker-compose.yml ] && command -v docker >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1 || docker-compose version >/dev/null 2>&1; then
      echo "docker"
      return
    fi
  fi
  if [ -d .git ]; then
    echo "git"
    return
  fi
  echo "unknown"
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

MODE=$(detect_mode)
echo "Update mode: $MODE"

case "$MODE" in
  docker)
    echo "Pulling images / rebuilding..."
    compose pull || true
    compose up -d --build
    echo "Docker update requested. Migrations run via start.sh on boot."
    ;;
  git)
    echo "Fetching tags..."
    git fetch --tags origin

    if [ -n "${FLOWCOMMENTS_UPDATE_TAG:-}" ]; then
      TAG="$FLOWCOMMENTS_UPDATE_TAG"
    else
      REPO="${FLOWCOMMENTS_UPDATE_REPO:-NathanConde-dev/flowcomments}"
      TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' | head -n 1)
    fi

    if [ -z "$TAG" ]; then
      echo "Could not resolve latest tag"
      exit 1
    fi

    echo "Checking out $TAG"
    git checkout "$TAG"

    echo "Installing dependencies..."
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi

    echo "Running migrations..."
    npx prisma migrate deploy

    echo "Building..."
    npm run build

    if command -v pm2 >/dev/null 2>&1; then
      echo "Restarting via pm2..."
      pm2 restart flowcomments flowcomments-worker || pm2 restart all || true
    elif command -v systemctl >/dev/null 2>&1 && systemctl list-units --type=service | grep -q flowcomments; then
      echo "Restarting via systemctl..."
      systemctl restart flowcomments || true
    else
      echo "Build done. Restart your process manager manually."
    fi
    ;;
  *)
    echo "Unknown update mode. Set FLOWCOMMENTS_UPDATE_MODE=docker|git"
    exit 1
    ;;
esac

echo "Update finished successfully."
