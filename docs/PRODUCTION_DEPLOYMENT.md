# Tandaza Production Deployment

This production setup uses a bare Git repository on the server. Pushing the `production` branch triggers a `post-receive` hook that checks out the app and runs Docker Compose.

## Server

- Host: `89.117.48.31`
- User: `root`
- App root: `/opt/tandaza-production`
- Bare repo: `/opt/tandaza-production/repo.git`
- Deploy branch: `production`

## Ports

The stack binds services to localhost to avoid interfering with other applications:

- Frontend: `127.0.0.1:3210`
- Backend: `127.0.0.1:8095`
- Tandaza MinIO API: `127.0.0.1:9010`
- Tandaza MinIO console: `127.0.0.1:9011`
- PostgreSQL: Docker network only

Existing server ports `3000`, `3001`, `3003`, `3004`, `9000`, `9001`, and `19001` are not used by Tandaza production.

## First-Time Setup

```bash
./scripts/setup-production-server.sh
```

The setup script:

- creates `.dev/tandaza_production_deploy_key` if missing;
- installs the public key on the server;
- creates `/opt/tandaza-production`;
- creates the bare Git repo;
- installs the `post-receive` hook;
- creates production env files with generated secrets.

Override defaults with environment variables when needed:

```bash
TANDAZA_PROD_FRONTEND_URL=https://your-domain.example \
TANDAZA_PROD_API_URL=https://api.your-domain.example \
TANDAZA_PROD_MEDIA_URL=https://media.your-domain.example \
TANDAZA_PROD_ADMIN_EMAIL=admin@your-domain.example \
TANDAZA_PROD_ADMIN_PASSWORD='replace-me' \
./scripts/setup-production-server.sh
```

## Deploy

```bash
./scripts/deploy-production.sh
```

The deploy script runs:

- backend compile checks;
- `npm run build`;
- a push to the server bare repo branch;
- server-side Docker Compose rebuild/restart through the `post-receive` hook;
- container health checks;
- public HTTPS smoke checks for frontend, API, and media.

Useful deployment options:

```bash
./scripts/deploy-production.sh --help
./scripts/deploy-production.sh --skip-tests
./scripts/deploy-production.sh --skip-build
./scripts/deploy-production.sh --no-public-checks
```

By default, the script refuses to deploy with uncommitted local changes. Use `--allow-dirty` only when you intentionally want to deploy the current working tree state.

## Nginx

Use `deploy/production/nginx.conf.example` as the starting point. Replace:

- `tandaza.example.com`
- `api.tandaza.example.com`
- `media.tandaza.example.com`
- `console.media.tandaza.example.com`

Then run Certbot only after DNS points to the server.

## Safety Notes

- The production stack uses its own Docker network, containers, and volumes.
- It does not stop or delete existing applications.
- It does not reuse the existing Tribute MinIO instance.
- Secrets are created on the server under `/opt/tandaza-production/env` and are not committed.
