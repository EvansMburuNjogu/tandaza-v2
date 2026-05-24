#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_HOST="${TANDAZA_PROD_HOST:-89.117.48.31}"
SERVER_USER="${TANDAZA_PROD_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_HOST}"
APP_ROOT="${TANDAZA_PROD_ROOT:-/opt/tandaza-production}"
BARE_REPO="${TANDAZA_PROD_BARE_REPO:-${APP_ROOT}/repo.git}"
BRANCH="${TANDAZA_PROD_BRANCH:-production}"
DEPLOY_KEY="${TANDAZA_PROD_SSH_KEY:-${ROOT_DIR}/.dev/tandaza_production_deploy_key}"

cd "$ROOT_DIR"

if [[ ! -f "$DEPLOY_KEY" ]]; then
  echo "Missing deploy key: $DEPLOY_KEY" >&2
  echo "Run ./scripts/setup-production-server.sh first." >&2
  exit 1
fi

echo "Running production checks..."
(cd backend && GOCACHE="${ROOT_DIR}/.dev/go-build" go test ./internal/httpapi -run '^$')
(cd frontend && npm run build)

if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git branch "$BRANCH"
fi

GIT_SSH_COMMAND="ssh -i ${DEPLOY_KEY} -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
  git push "ssh://$SERVER$BARE_REPO" "HEAD:refs/heads/$BRANCH"

echo "Waiting for containers..."
ssh -i "$DEPLOY_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SERVER" "bash -lc 'set -euo pipefail; cd \"$APP_ROOT/app\"; docker compose -f deploy/production/docker-compose.yml ps; curl -sS -i --max-time 10 http://127.0.0.1:8095/health | head -20; curl -sS -I --max-time 10 http://127.0.0.1:3210/login | head -20'"

echo "Tandaza production deploy finished."
