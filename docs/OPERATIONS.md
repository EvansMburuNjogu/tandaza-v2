# Operations

This document covers production monitoring, error alerts, and database backup operations.

## Health Checks

Use these endpoints from the hosting platform or uptime monitor:

```text
GET /health
GET /ready
```

`/ready` returns database mode, storage driver, payment mode, notification queue mode, and environment metadata.

## Production-Local Smoke

Use the smoke script after deployment-like local startup:

```bash
./scripts/dev-run.sh
./scripts/smoke-prod-local.sh
```

For MinIO/S3 validation:

```bash
docker compose -f docker-compose.minio.yml up -d
STORAGE_DRIVER=s3 ./scripts/dev-run.sh
STORAGE_DRIVER=s3 ./scripts/smoke-prod-local.sh
```

The smoke script verifies admin, organizer, exhibitor, sponsor, and visitor access paths, selected admin country endpoints, visitor email verification, reports, and media upload.

## Error Alerts

Configure a webhook receiver such as Slack, Discord, Grafana OnCall, Better Stack, or a custom incident endpoint:

```bash
ERROR_WEBHOOK_URL=https://alerts.example.com/tandaza
ERROR_ALERT_MIN_STATUS=500
```

When configured, the backend posts a JSON alert for HTTP responses at or above the configured status. The request path, status, latency, request id, user id, environment, and safe metadata are included. Alert delivery is best-effort and never blocks the user request.

## Database Backups

Create one backup:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/tandaza?sslmode=require ./scripts/db-backup.sh
```

Run scheduled backups with retention:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/tandaza?sslmode=require \
BACKUP_DIR=/var/backups/tandaza \
BACKUP_INTERVAL_SECONDS=86400 \
BACKUP_RETENTION_DAYS=14 \
./scripts/db-backup-runner.sh
```

Restore into a staging database before trusting a backup:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/tandaza_staging?sslmode=require ./scripts/db-restore.sh /var/backups/tandaza/tandaza-YYYYMMDDTHHMMSSZ.dump
```

## Production Expectations

- Backups run at least daily.
- Restore is rehearsed before launch and after schema-heavy releases.
- `/health` and `/ready` are monitored externally.
- 5xx alerts route to a human-owned channel.
- App logs and audit logs persist in PostgreSQL.
