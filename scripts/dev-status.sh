#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/.dev"
DATABASE_URL="${DATABASE_URL:-postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable}"
STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
S3_ENDPOINT="${S3_ENDPOINT:-http://127.0.0.1:9000}"

status_for() {
  local label="$1"
  local port="$2"
  local pid_file="$3"
  local log_file="$4"
  local managed_pid=""
  local port_pids=""

  if [[ -f "$pid_file" ]]; then
    managed_pid="$(cat "$pid_file" 2>/dev/null || true)"
  fi
  port_pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' || true)"

  echo "${label}:"
  if [[ -n "$managed_pid" ]] && kill -0 "$managed_pid" 2>/dev/null; then
    echo "  Managed PID: ${managed_pid} (running)"
  elif [[ -n "$managed_pid" ]]; then
    echo "  Managed PID: ${managed_pid} (stale)"
  else
    echo "  Managed PID: none"
  fi

  if [[ -n "$port_pids" ]]; then
    echo "  Port ${port}: listening by PID(s) ${port_pids}"
  else
    echo "  Port ${port}: not listening"
  fi
  echo "  Log: ${log_file}"
}

status_for "Backend" "8080" "$DEV_DIR/backend.pid" "$DEV_DIR/backend.log"
status_for "Frontend" "3000" "$DEV_DIR/frontend.pid" "$DEV_DIR/frontend.log"

echo "Database:"
if command -v psql >/dev/null 2>&1 && psql "$DATABASE_URL" -c "select 1;" >/dev/null 2>&1; then
  echo "  PostgreSQL: reachable"
else
  echo "  PostgreSQL: not reachable"
fi
echo "  URL: ${DATABASE_URL}"

echo "Storage:"
echo "  Driver: ${STORAGE_DRIVER}"
if [[ "$STORAGE_DRIVER" == "s3" || "$STORAGE_DRIVER" == "minio" ]]; then
  if curl -fsS "${S3_ENDPOINT}/minio/health/ready" >/dev/null 2>&1; then
    echo "  MinIO/S3: reachable"
  else
    echo "  MinIO/S3: not reachable"
  fi
  echo "  Endpoint: ${S3_ENDPOINT}"
fi

echo
echo "Run:  ./scripts/dev-run.sh"
echo "Stop: ./scripts/dev-stop.sh"
