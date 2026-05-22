# Production Readiness

This document tracks the work needed to take Tandaza from local demo to production launch.

## Completed In This Pass

- Added production-aware Paystack initialization for exhibitor activation and sponsor ad payments.
- Added signed Paystack webhook verification with `X-Paystack-Signature`.
- Made provider-mode payment confirmation webhook-only.
- Extended the Paystack webhook to confirm both exhibitor activation payments and sponsor ad payments.
- Added MinIO/S3-compatible media storage with local filesystem fallback and backend proxy support.
- Added database backup and restore scripts for PostgreSQL operations.
- Added rate limiting for sensitive auth, media upload, webhook, and ad tracking endpoints.
- Added an optional background notification worker for due email, SMS, push, and in-app dispatch.
- Added admin payment reconciliation actions for failed, cancelled, and refunded payments.
- Added Paystack failed/refunded webhook status handling.
- Added external error alert webhook support for 5xx/API failure monitoring.
- Added a scheduled database backup runner with retention.
- Added a production-local smoke script for PostgreSQL mode, role dashboards, country-scoped admin endpoints, visitor email verification, reports, and media upload.
- Made the local dev runner storage-aware so it can fail clearly when MinIO/S3 mode is selected but unavailable.
- Replaced the old deployment guide with production environment, webhook, backup, and health-check instructions.

## Production Defaults

- `DATABASE_MODE=postgres`
- `APP_ENV=production`
- `PAYMENT_MODE=provider`
- `ENFORCE_HTTPS=true`
- `NOTIFICATION_WORKER_ENABLED=true`
- `ERROR_WEBHOOK_URL` should point to an owned alerting channel.
- `PII_ENCRYPTION_KEY` must be configured before live user data is stored.
- Paystack, SMTP, SMS, WhatsApp, push, and realtime settings should be managed through admin settings where available.

## Remaining Production Work

- Run a full browser smoke test for admin, organizer, exhibitor, visitor, and sponsor journeys against PostgreSQL mode.

## Verification Commands

```bash
GOCACHE=/Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/go-cache go test ./...
cd frontend && npm run build
./scripts/dev-run.sh
./scripts/smoke-prod-local.sh
./scripts/db-backup.sh
./scripts/db-backup-runner.sh
docker compose -f docker-compose.minio.yml up -d
```

For MinIO validation, start a local S3-compatible server first:

```bash
docker compose -f docker-compose.minio.yml up -d
STORAGE_DRIVER=s3 ./scripts/dev-run.sh
STORAGE_DRIVER=s3 ./scripts/smoke-prod-local.sh
```
