#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/.dev"

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"
FRONTEND_URL="http://127.0.0.1:${FRONTEND_PORT}"
DATABASE_MODE="${DATABASE_MODE:-postgres}"
DATABASE_URL="${DATABASE_URL:-postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@tandaza.demo}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
LOCAL_STORAGE_DIR="${LOCAL_STORAGE_DIR:-../.dev/uploads}"
S3_ENDPOINT="${S3_ENDPOINT:-http://127.0.0.1:9000}"
S3_ACCESS_KEY="${S3_ACCESS_KEY:-tandaza}"
S3_SECRET_KEY="${S3_SECRET_KEY:-tandaza-secret}"
S3_BUCKET="${S3_BUCKET:-tandaza-media}"
S3_REGION="${S3_REGION:-us-east-1}"
S3_PUBLIC_URL="${S3_PUBLIC_URL:-http://127.0.0.1:9000/tandaza-media}"
S3_FORCE_PATH_STYLE="${S3_FORCE_PATH_STYLE:-true}"
PAYMENT_MODE="${PAYMENT_MODE:-auto}"
NOTIFICATION_WORKER_ENABLED="${NOTIFICATION_WORKER_ENABLED:-false}"

BACKEND_PID_FILE="$DEV_DIR/backend.pid"
FRONTEND_PID_FILE="$DEV_DIR/frontend.pid"
BACKEND_LOG="$DEV_DIR/backend.log"
FRONTEND_LOG="$DEV_DIR/frontend.log"
BACKEND_BIN="$DEV_DIR/tandaza-api"
GO_CACHE_DIR="$DEV_DIR/go-cache"
FRONTEND_DIST_DIR=".next-dev"

mkdir -p "$DEV_DIR"
mkdir -p "$GO_CACHE_DIR"

pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

children_of() {
  pgrep -P "$1" 2>/dev/null || true
}

kill_tree() {
  local pid="$1"
  local child
  for child in $(children_of "$pid"); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

wait_for_exit() {
  local pid="$1"
  local label="$2"
  local attempts=30
  while pid_alive "$pid" && [[ "$attempts" -gt 0 ]]; do
    sleep 0.2
    attempts=$((attempts - 1))
  done
  if pid_alive "$pid"; then
    echo "Force stopping ${label} process ${pid}."
    kill -9 "$pid" 2>/dev/null || true
  fi
}

stop_owned_service() {
  local label="$1"
  local pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if pid_alive "$pid"; then
    echo "Stopping previous Tandaza ${label} process ${pid}."
    kill_tree "$pid"
    wait_for_exit "$pid" "$label"
  else
    echo "Removing stale Tandaza ${label} PID file."
  fi
  rm -f "$pid_file"
}

port_pid() {
  lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

assert_port_available() {
  local port="$1"
  local label="$2"
  local pid
  pid="$(port_pid "$port")"
  if [[ -n "$pid" ]]; then
    echo "Cannot start Tandaza ${label}: port ${port} is already used by process ${pid}."
    echo "Stop that process yourself, or run ./scripts/dev-status.sh to inspect current listeners."
    exit 1
  fi
}

wait_for_url() {
  local label="$1"
  local url="$2"
  local attempts=90
  until curl -fsS "$url" >/dev/null 2>&1; do
    attempts=$((attempts - 1))
    if [[ "$attempts" -le 0 ]]; then
      echo "${label} did not become ready at ${url}."
      echo "Backend log:  ${BACKEND_LOG}"
      echo "Frontend log: ${FRONTEND_LOG}"
      exit 1
    fi
    sleep 1
  done
}

check_postgres() {
  if [[ "$DATABASE_MODE" != "postgres" ]]; then
    return
  fi
  if ! command -v psql >/dev/null 2>&1; then
    echo "DATABASE_MODE=postgres, but psql is not installed or not on PATH."
    echo "Install PostgreSQL or run DATABASE_MODE=memory ./scripts/dev-run.sh for temporary demo mode."
    exit 1
  fi
  if ! psql "$DATABASE_URL" -c "select 1;" >/dev/null 2>&1; then
    echo "Cannot connect to local PostgreSQL database."
    echo "DATABASE_URL=${DATABASE_URL}"
    echo
    echo "Make sure PostgreSQL is running and the database exists, for example:"
    echo "  brew services start postgresql@15"
    echo "  createdb -h 127.0.0.1 -p 5432 -U evansmburu tandaza"
    echo
    echo "For temporary non-persistent mode:"
    echo "  DATABASE_MODE=memory ./scripts/dev-run.sh"
    exit 1
  fi
}

check_storage() {
  if [[ "$STORAGE_DRIVER" != "s3" && "$STORAGE_DRIVER" != "minio" ]]; then
    return
  fi
  if ! curl -fsS "${S3_ENDPOINT}/minio/health/ready" >/dev/null 2>&1; then
    echo "STORAGE_DRIVER=${STORAGE_DRIVER}, but MinIO/S3 is not reachable."
    echo "S3_ENDPOINT=${S3_ENDPOINT}"
    echo
    echo "Start local MinIO with:"
    echo "  docker compose -f docker-compose.minio.yml up -d"
    echo
    echo "Or use local fallback:"
    echo "  STORAGE_DRIVER=local ./scripts/dev-run.sh"
    exit 1
  fi
}

check_login_proxy() {
  local payload
  payload="{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}"
  if ! curl -fsS -X POST "${FRONTEND_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    --data "$payload" >/dev/null 2>&1; then
    echo "Frontend auth proxy is reachable, but admin login did not succeed."
    echo "Check backend log:  ${BACKEND_LOG}"
    echo "Check frontend log: ${FRONTEND_LOG}"
    exit 1
  fi
}

stop_owned_service "frontend" "$FRONTEND_PID_FILE"
stop_owned_service "backend" "$BACKEND_PID_FILE"

assert_port_available "$BACKEND_PORT" "backend"
assert_port_available "$FRONTEND_PORT" "frontend"
check_postgres
check_storage

: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"

echo "Starting Tandaza backend on ${BACKEND_URL}."
echo "Building Tandaza backend."
(
  cd "$ROOT_DIR/backend"
  GOCACHE="$GO_CACHE_DIR" go build -o "$BACKEND_BIN" ./cmd/api
)
(
  cd "$ROOT_DIR/backend"
  nohup env \
    DATABASE_MODE="$DATABASE_MODE" \
    DATABASE_URL="$DATABASE_URL" \
    STORAGE_DRIVER="$STORAGE_DRIVER" \
    LOCAL_STORAGE_DIR="$LOCAL_STORAGE_DIR" \
    S3_ENDPOINT="$S3_ENDPOINT" \
    S3_ACCESS_KEY="$S3_ACCESS_KEY" \
    S3_SECRET_KEY="$S3_SECRET_KEY" \
    S3_BUCKET="$S3_BUCKET" \
    S3_REGION="$S3_REGION" \
    S3_PUBLIC_URL="$S3_PUBLIC_URL" \
    S3_FORCE_PATH_STYLE="$S3_FORCE_PATH_STYLE" \
    PAYMENT_MODE="$PAYMENT_MODE" \
    NOTIFICATION_WORKER_ENABLED="$NOTIFICATION_WORKER_ENABLED" \
    PORT="$BACKEND_PORT" \
    FRONTEND_URL="$FRONTEND_URL" \
    "$BACKEND_BIN" >"$BACKEND_LOG" 2>&1 &
  echo "$!" > "$BACKEND_PID_FILE"
)

wait_for_url "Backend" "${BACKEND_URL}/ready"

echo "Starting Tandaza frontend on ${FRONTEND_URL}."
(
  cd "$ROOT_DIR/frontend"
  if [[ -d "$FRONTEND_DIST_DIR" ]]; then
    echo "Removing stale frontend dev build cache ${FRONTEND_DIST_DIR}." >>"$FRONTEND_LOG"
    rm -rf "$FRONTEND_DIST_DIR"
  fi
  nohup env \
    API_BASE_URL="$BACKEND_URL" \
    NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL" \
    NEXT_DIST_DIR="$FRONTEND_DIST_DIR" \
    npm run dev -- --hostname 127.0.0.1 --port "$FRONTEND_PORT" >"$FRONTEND_LOG" 2>&1 &
  echo "$!" > "$FRONTEND_PID_FILE"
)

wait_for_url "Frontend" "${FRONTEND_URL}/login"
check_login_proxy

cat <<READY
Tandaza is ready to test.
Frontend: ${FRONTEND_URL}/login
Backend:  ${BACKEND_URL}
Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
Database: ${DATABASE_MODE} (${DATABASE_URL})
Storage:  ${STORAGE_DRIVER}

Logs:
Backend:  ${BACKEND_LOG}
Frontend: ${FRONTEND_LOG}

Stop:     ./scripts/dev-stop.sh
Status:   ./scripts/dev-status.sh
READY
