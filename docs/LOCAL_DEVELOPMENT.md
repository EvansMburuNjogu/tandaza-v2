# Local Development

Use the root development runner when you want Tandaza frontend and backend running together after a change.

## Start Both Services

```bash
./scripts/dev-run.sh
```

The runner starts:

- Go API at `http://127.0.0.1:8080`
- Next.js frontend at `http://127.0.0.1:3000`
- backend database mode as `postgres`
- local PostgreSQL database URL `postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable`
- local media storage by default, with optional MinIO/S3 mode
- a compiled local backend binary at `.dev/tandaza-api`
- a separate Next.js dev build directory at `frontend/.next-dev`

It also verifies the frontend auth proxy can log in with the demo administrator:

```text
admin@tandaza.demo / admin123
```

When the app is ready, the script prints:

```text
Tandaza is ready to test.
Frontend: http://127.0.0.1:3000/login
Backend:  http://127.0.0.1:8080
Admin:    admin@tandaza.demo / admin123
Database: postgres (postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable)
Storage:  local
```

## Local PostgreSQL

The local runner uses PostgreSQL by default so audit logs, countries, categories, settings, users, and admin-created records survive backend restarts.

Expected local database:

```bash
postgres://evansmburu@127.0.0.1:5432/tandaza?sslmode=disable
```

If the database is missing, create it with:

```bash
createdb -h 127.0.0.1 -p 5432 -U evansmburu tandaza
```

If PostgreSQL is stopped, start it with:

```bash
brew services start postgresql@15
```

For a temporary non-persistent demo, you can still run:

```bash
DATABASE_MODE=memory ./scripts/dev-run.sh
```

## Local Media Storage

The runner stores uploaded files locally by default:

```bash
STORAGE_DRIVER=local ./scripts/dev-run.sh
```

To test MinIO/S3-compatible storage, start MinIO first, then run Tandaza with the S3 driver:

```bash
docker compose -f docker-compose.minio.yml up -d
STORAGE_DRIVER=s3 ./scripts/dev-run.sh
```

The default MinIO settings are:

```text
S3_ENDPOINT=http://127.0.0.1:9000
S3_BUCKET=tandaza-media
S3_ACCESS_KEY=tandaza
S3_SECRET_KEY=tandaza-secret
```

When `STORAGE_DRIVER=s3` or `STORAGE_DRIVER=minio`, the runner checks MinIO readiness before starting the app.

## Production-Local Smoke Test

After both services are running, use the smoke script to validate the current production-critical backend journeys:

```bash
./scripts/smoke-prod-local.sh
```

For MinIO mode:

```bash
STORAGE_DRIVER=s3 ./scripts/smoke-prod-local.sh
```

The smoke test checks readiness metadata, admin login through the frontend proxy, country-scoped admin endpoints, visitor signup and email verification, role dashboards, media upload, and reports.

## Stop Services

```bash
./scripts/dev-stop.sh
```

This only stops processes previously started by `./scripts/dev-run.sh`.

## Check Status

```bash
./scripts/dev-status.sh
```

Logs and PID files are stored in `.dev/`:

- `.dev/backend.log`
- `.dev/frontend.log`
- `.dev/backend.pid`
- `.dev/frontend.pid`
- `.dev/tandaza-api`

The frontend dev server uses `frontend/.next-dev` so `npm run build` can still write to `frontend/.next` without corrupting the running dev server.

Use `127.0.0.1` consistently while testing auth. Browser cookies are scoped by host, so a login cookie created on `http://127.0.0.1:3000` is not available on `http://localhost:3000`.

## Port Safety

The runner refuses to kill unrelated processes. If `3000` or `8080` is already used by a service that was not started by the runner, stop that process yourself first, then run `./scripts/dev-run.sh` again.
