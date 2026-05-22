# Tandaza Deployment Runbook

This runbook documents how Tandaza is deployed to the demo server using a bare Git repository with a `post-receive` hook.

## Demo Server

- Frontend: `https://demo.tandaza.africa`
- Backend API: `https://api.demo.tandaza.africa`
- MinIO console: `https://demo.minio.tandaza.africa`
- MinIO API: `https://api.demo.minio.tandaza.africa`
- Server IP: `207.180.235.113`
- SSH user: `root`
- Local deploy key: `.dev/tandaza_demo_deploy_key`

## Server Layout

- App checkout: `/opt/tandaza-demo/app`
- Bare Git repo: `/opt/tandaza-demo/repo.git`
- Environment files: `/opt/tandaza-demo/env`
- Deployment hook: `/opt/tandaza-demo/repo.git/hooks/post-receive`
- Backend service: `tandaza-backend.service`
- Frontend service: `tandaza-frontend.service`
- Docker compose file: `/opt/tandaza-demo/docker-compose.yml`

## Runtime Ports

All public traffic should go through Nginx and HTTPS. App services bind to localhost so they do not interfere with other applications on the server.

- Frontend Next.js: `127.0.0.1:3200`
- Backend Go API: `127.0.0.1:8091`
- PostgreSQL container: `127.0.0.1:5433`
- MinIO API: `127.0.0.1:9002`
- MinIO console: `127.0.0.1:9003`

## Normal Deployment Flow

The server uses a bare Git repo. Pushing to `main` triggers `/opt/tandaza-demo/repo.git/hooks/post-receive`.

The hook:

- checks out `main` into `/opt/tandaza-demo/app`
- starts Tandaza PostgreSQL and MinIO containers
- builds the Go backend
- installs the backend binary as `/usr/local/bin/tandaza-api`
- runs `npm ci`
- runs `npm run build`
- restarts `tandaza-backend.service`
- restarts `tandaza-frontend.service`

## Local Remote Setup

Use this only when the local Git repository is healthy and tracking the same history as the server repo.

```bash
git remote add demo root@207.180.235.113:/opt/tandaza-demo/repo.git
git push demo main
```

If local Git metadata is unhealthy or the working tree shows unrelated untracked files, use the targeted deployment flow below.

## Targeted Deployment Flow

Use this when only specific files should be pushed and the local root Git state is not reliable.

### 1. Create a temporary clone on the server

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "rm -rf /tmp/tandaza-change && git clone /opt/tandaza-demo/repo.git /tmp/tandaza-change"
```

### 2. Copy only the changed files

Backend-only example:

```bash
rsync -azR \
  -e 'ssh -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key -o StrictHostKeyChecking=accept-new' \
  backend/internal/httpapi/server.go \
  root@207.180.235.113:/tmp/tandaza-change/
```

Frontend and backend example:

```bash
rsync -azR \
  -e 'ssh -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key -o StrictHostKeyChecking=accept-new' \
  backend/internal/domain/types.go \
  backend/internal/httpapi/server.go \
  backend/internal/httpapi/paystack.go \
  frontend/lib/api/contracts.ts \
  frontend/lib/api/http.ts \
  'frontend/app/exhibitor/expos/[id]/page.tsx' \
  docs/API.md \
  docs/IMPLEMENTATION_LOG.md \
  root@207.180.235.113:/tmp/tandaza-change/
```

### 3. Inspect the diff on the server

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /tmp/tandaza-change && git status --short && git diff --stat"
```

For a specific file:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /tmp/tandaza-change && git diff -- backend/internal/httpapi/server.go | head -160"
```

### 4. Run checks before pushing

Backend focused compile check:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /tmp/tandaza-change/backend && GOCACHE=/tmp/tandaza-change/.gocache go test ./internal/httpapi -run '^$'"
```

Frontend build check, when frontend files changed:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /tmp/tandaza-change/frontend && npm ci && npm run build"
```

### 5. Commit and push

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /tmp/tandaza-change && git add <changed-files> && git commit -m '<commit message>' && git push origin main"
```

Example:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /tmp/tandaza-change && git add backend/internal/httpapi/server.go && git commit -m 'Expand exhibitor ROI analytics backend' && git push origin main"
```

## Post-Deploy Verification

Check recent commits:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "git --git-dir=/opt/tandaza-demo/repo.git log --oneline -5 --decorate"
```

Check services:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "systemctl status tandaza-backend.service tandaza-frontend.service --no-pager"
```

Check logs:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "journalctl -u tandaza-backend.service -n 80 --no-pager && journalctl -u tandaza-frontend.service -n 80 --no-pager"
```

Check backend health through localhost with the proxy header:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "curl -sS -i --max-time 10 -H 'X-Forwarded-Proto: https' http://127.0.0.1:8091/health | head -20"
```

Check frontend from the public domain:

```bash
curl -I --max-time 15 https://demo.tandaza.africa/login
```

## Environment And Database

The demo server should run PostgreSQL mode, not memory mode.

Confirm from logs:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "journalctl -u tandaza-backend.service -n 40 --no-pager | grep 'using postgres store'"
```

Check containers:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "cd /opt/tandaza-demo && docker compose ps"
```

## Nginx And Certificates

Nginx config:

```text
/etc/nginx/conf.d/tandaza-demo.conf
```

Required DNS A records:

```text
demo.tandaza.africa
api.demo.tandaza.africa
demo.minio.tandaza.africa
api.demo.minio.tandaza.africa
```

Issue certificates after DNS resolves:

```bash
certbot --nginx \
  -d demo.tandaza.africa \
  -d api.demo.tandaza.africa \
  -d demo.minio.tandaza.africa \
  -d api.demo.minio.tandaza.africa
```

Test Nginx:

```bash
nginx -t
systemctl reload nginx
```

## Rollback

Find the previous commit:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "git --git-dir=/opt/tandaza-demo/repo.git log --oneline -10"
```

Create and push a revert commit from a temporary clone:

```bash
ssh -o ConnectTimeout=10 \
  -i /Users/evansmburu/Desktop/Maalim/tandaza-v2/.dev/tandaza_demo_deploy_key \
  -o StrictHostKeyChecking=accept-new \
  root@207.180.235.113 \
  "rm -rf /tmp/tandaza-rollback && git clone /opt/tandaza-demo/repo.git /tmp/tandaza-rollback && cd /tmp/tandaza-rollback && git revert <bad-commit-sha> --no-edit && git push origin main"
```

## Rules

- Do not copy or push the whole working tree when local Git is unhealthy.
- Do not include `.dev`, `.next`, `node_modules`, caches, `.DS_Store`, or temporary files.
- Prefer targeted file pushes until the local Git history is repaired.
- Always inspect `git diff --stat` before committing.
- Always run at least a focused backend compile or frontend build for the changed area.
- Always confirm services restart after the deploy hook completes.
- Never kill unrelated processes or change unrelated Nginx apps on the server.

