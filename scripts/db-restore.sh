#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable}"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: DATABASE_URL=postgres://... ./scripts/db-restore.sh /path/to/tandaza.dump"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file was not found: $BACKUP_FILE"
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required to restore Tandaza PostgreSQL backups."
  exit 1
fi

echo "This will restore Tandaza data into:"
echo "$DATABASE_URL"
echo
read -r -p "Type RESTORE to continue: " confirmation
if [[ "$confirmation" != "RESTORE" ]]; then
  echo "Restore cancelled."
  exit 1
fi

pg_restore "$BACKUP_FILE" --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-privileges

echo "Tandaza database restore completed."
