# Tandaza Production Deployment Guide

Tandaza production must run with PostgreSQL, HTTPS, signed payment webhooks, persisted notification delivery attempts, and audited admin actions. Memory mode is only for short-lived demos.

## Required Runtime

- Backend: Go API from `backend/cmd/api`
- Frontend: Next.js app from `frontend`
- Database: PostgreSQL
- File storage: local disk for development; object storage or persistent mounted volume for production uploads
- Providers: Paystack, SMTP, TiaraConnect SMS, optional push/realtime webhooks

## Required Backend Environment

```bash
APP_ENV=production
DATABASE_MODE=postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/tandaza?sslmode=require
JWT_SECRET=<long-random-secret>
FRONTEND_URL=https://app.example.com
ENFORCE_HTTPS=true
RATE_LIMIT_PER_MINUTE=120
NOTIFICATION_WORKER_ENABLED=true
NOTIFICATION_DISPATCH_INTERVAL_SECONDS=60
ERROR_WEBHOOK_URL=https://alerts.example.com/tandaza
ERROR_ALERT_MIN_STATUS=500
PII_ENCRYPTION_KEY=<long-random-secret>
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=<temporary-strong-password>
BOOTSTRAP_ADMIN_NAME=Platform Administrator
BOOTSTRAP_ADMIN_COMPANY=Tandaza
PAYMENT_MODE=provider
PAYSTACK_SECRET_KEY=<sk_live_or_test>
PAYSTACK_PUBLIC_KEY=<pk_live_or_test>
PAYSTACK_WEBHOOK_SECRET=<same-secret-used-to-verify-webhooks>
PAYSTACK_CALLBACK_URL=https://app.example.com/payments/callback
STORAGE_DRIVER=s3
S3_ENDPOINT=https://minio-or-bucket.example.com
S3_ACCESS_KEY=<bucket-access-key>
S3_SECRET_KEY=<bucket-secret-key>
S3_BUCKET=tandaza-media
S3_REGION=us-east-1
S3_PUBLIC_URL=https://media.example.com/tandaza-media
S3_FORCE_PATH_STYLE=true
```

Notification provider credentials may be seeded from environment variables, but the runtime dispatcher reads admin/database settings first:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM_EMAIL=notifications@example.com
SMTP_FROM_NAME=Tandaza
TIARA_API_KEY=<tiaraconnect-key>
TIARA_SENDER_ID=CONNECT
PUSH_WEBHOOK_URL=https://push.example.com/tandaza
REALTIME_WEBHOOK_URL=https://realtime.example.com/tandaza
```

## Payment Webhooks

Configure Paystack to call:

```text
POST https://api.example.com/api/v1/payments/paystack/webhook
```

Production payment confirmation is webhook-only. Manual confirmation endpoints remain available for local simulated mode, but return a conflict in provider mode.

The backend verifies `X-Paystack-Signature` using `PAYSTACK_WEBHOOK_SECRET` or the admin Paystack webhook secret. Use the Tandaza payment id as the Paystack reference.

## Media Storage

Use MinIO or another S3-compatible bucket in production. Local filesystem storage is only for temporary development.

See `docs/MEDIA_STORAGE.md` for MinIO setup and environment variables.

## Database Operations

Migrations run automatically when the Go API starts in PostgreSQL mode.

Create a backup:

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

Restore a backup:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/tandaza?sslmode=require ./scripts/db-restore.sh .dev/backups/tandaza-YYYYMMDDTHHMMSSZ.dump
```

Before each production migration, create a fresh backup and confirm a restore in a staging database.

## Health Checks

- Readiness: `GET /ready`
- Health: `GET /health`

The platform should monitor both endpoints, process restarts, HTTP error rate, database connections, webhook failures, notification failures, and app logs.

## Frontend Environment

```bash
API_BASE_URL=https://api.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

The frontend should access private APIs through the HttpOnly session proxy. Do not expose backend secrets to the browser.

## Production Checklist

- `go test ./...` passes.
- `npm run build` passes.
- PostgreSQL data survives restart.
- Bootstrap admin can log in and must change password where configured.
- Paystack initialization returns a real authorization URL.
- Signed Paystack webhook confirms exhibitor activation and sponsor ad payments.
- Media uploads are stored in MinIO/S3-compatible object storage and load back through public or proxied URLs.
- Notification delivery attempts are persisted for email, SMS, push, and in-app/realtime.
- Notification worker is enabled or an external scheduler calls `/api/v1/admin/notifications/dispatch-due`.
- `/health`, `/ready`, and `ERROR_WEBHOOK_URL` are connected to external monitoring/alerting.
- Audit logs and app logs persist in PostgreSQL.
- HTTPS enforcement is enabled behind the trusted proxy.
- PII encryption key is configured before real user data is stored.
- Backups are scheduled and restore-tested.
