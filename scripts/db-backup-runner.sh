#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/.dev/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
DATABASE_URL="${DATABASE_URL:-postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable}"

if ! [[ "$BACKUP_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$BACKUP_INTERVAL_SECONDS" -lt 60 ]]; then
  echo "BACKUP_INTERVAL_SECONDS must be a number >= 60."
  exit 1
fi

if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [[ "$BACKUP_RETENTION_DAYS" -lt 1 ]]; then
  echo "BACKUP_RETENTION_DAYS must be a number >= 1."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Tandaza backup runner started."
echo "Backup dir:      $BACKUP_DIR"
echo "Interval:        ${BACKUP_INTERVAL_SECONDS}s"
echo "Retention days:  ${BACKUP_RETENTION_DAYS}"

while true; do
  if "$ROOT_DIR/scripts/db-backup.sh"; then
    find "$BACKUP_DIR" -type f -name 'tandaza-*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -print -delete
  else
    echo "Backup failed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")."
  fi
  sleep "$BACKUP_INTERVAL_SECONDS"
done
