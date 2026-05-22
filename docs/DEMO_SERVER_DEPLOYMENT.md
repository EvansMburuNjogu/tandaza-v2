# Demo Server Deployment

Demo server:

- Frontend: `https://demo.tandaza.africa`
- Backend API: `https://api.demo.tandaza.africa`
- MinIO console: `https://demo.minio.tandaza.africa`
- MinIO API: `https://api.demo.minio.tandaza.africa`

## Server Layout

- App checkout: `/opt/tandaza-demo/app`
- Bare Git repo: `/opt/tandaza-demo/repo.git`
- Environment files: `/opt/tandaza-demo/env`
- Deployment hook: `/opt/tandaza-demo/repo.git/hooks/post-receive`
- Backend service: `tandaza-backend`
- Frontend service: `tandaza-frontend`
- Docker project: `/opt/tandaza-demo/docker-compose.yml`

## Ports

All Tandaza app ports bind only to localhost so existing public apps are not disturbed.

- Frontend Next.js: `127.0.0.1:3200`
- Backend Go API: `127.0.0.1:8091`
- PostgreSQL container: `127.0.0.1:5433`
- MinIO API: `127.0.0.1:9002`
- MinIO console: `127.0.0.1:9003`

Existing apps on ports `3000`, `3100`, `4000`, and `8088` are left untouched.

## Deploy With Git

The server uses a bare Git repository with a `post-receive` hook. Pushes to `main` deploy automatically.

```bash
git remote add demo root@207.180.235.113:/opt/tandaza-demo/repo.git
git push demo main
```

The hook:

- checks out `main` into `/opt/tandaza-demo/app`
- starts Tandaza-only PostgreSQL and MinIO containers
- builds the Go backend
- installs the backend binary to `/usr/local/bin/tandaza-api`
- runs `npm ci` and `npm run build`
- restarts `tandaza-backend` and `tandaza-frontend`

## DNS Required

Before HTTPS certificates can be issued, these DNS A records must point to `207.180.235.113`:

```text
demo.tandaza.africa
api.demo.tandaza.africa
demo.minio.tandaza.africa
api.demo.minio.tandaza.africa
```

After DNS resolves, issue certificates:

```bash
certbot --nginx \
  -d demo.tandaza.africa \
  -d api.demo.tandaza.africa \
  -d demo.minio.tandaza.africa \
  -d api.demo.minio.tandaza.africa
```

## Useful Commands

```bash
systemctl status tandaza-backend tandaza-frontend --no-pager
journalctl -u tandaza-backend -f
journalctl -u tandaza-frontend -f
cd /opt/tandaza-demo && docker compose ps
curl -H "X-Forwarded-Proto: https" http://127.0.0.1:8091/ready
```

Demo admin:

```text
admin@tandaza.demo / admin123
```
