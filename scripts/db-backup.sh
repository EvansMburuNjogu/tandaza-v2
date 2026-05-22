#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/.dev/backups}"
DATABASE_URL="${DATABASE_URL:-postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_FILE="${1:-$BACKUP_DIR/tandaza-$STAMP.dump}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required to back up Tandaza PostgreSQL."
  exit 1
fi

mkdir -p "$(dirname "$OUT_FILE")"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$OUT_FILE"

echo "Tandaza database backup created:"
echo "$OUT_FILE"
