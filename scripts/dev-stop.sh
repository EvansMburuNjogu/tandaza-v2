#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="$ROOT_DIR/.dev"

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

stop_service() {
  local label="$1"
  local pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    echo "No Tandaza ${label} PID file found."
    return
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    echo "Removing stale Tandaza ${label} PID file."
    rm -f "$pid_file"
    return
  fi

  echo "Stopping Tandaza ${label} process ${pid}."
  kill_tree "$pid"

  local attempts=30
  while kill -0 "$pid" 2>/dev/null && [[ "$attempts" -gt 0 ]]; do
    sleep 0.2
    attempts=$((attempts - 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "Force stopping Tandaza ${label} process ${pid}."
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
}

stop_service "frontend" "$DEV_DIR/frontend.pid"
stop_service "backend" "$DEV_DIR/backend.pid"

echo "Tandaza background services stopped."
