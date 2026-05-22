#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_HOST="${TANDAZA_DEMO_HOST:-207.180.235.113}"
SERVER_USER="${TANDAZA_DEMO_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_HOST}"
BARE_REPO="${TANDAZA_DEMO_BARE_REPO:-/opt/tandaza-demo/repo.git}"
BRANCH="${TANDAZA_DEMO_BRANCH:-main}"
COMMIT_MESSAGE="${1:-Deploy Tandaza frontend and backend}"
DEPLOY_KEY="${TANDAZA_DEMO_SSH_KEY:-${ROOT_DIR}/.dev/tandaza_demo_deploy_key}"
REMOTE_TMP="/tmp/tandaza-deploy-$(date +%Y%m%d%H%M%S)"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/deploy-demo.sh "Commit message"

Authentication:
  Preferred: .dev/tandaza_demo_deploy_key
  Password fallback: set TANDAZA_DEMO_SSH_PASSWORD or enter it when prompted.

Example password fallback:
  TANDAZA_DEMO_SSH_PASSWORD='your-password' ./scripts/deploy-demo.sh "Improve chat composer"

Notes:
  - Do not commit passwords into this repository.
  - This deploys frontend and backend together through the server bare repo.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_command ssh
need_command rsync
need_command git

SSH_BASE=(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
RSYNC_BASE=(rsync -az --delete)

if [[ -f "$DEPLOY_KEY" ]]; then
  SSH_BASE+=(-i "$DEPLOY_KEY")
  RSYNC_SSH="ssh -i ${DEPLOY_KEY} -o StrictHostKeyChecking=accept-new"
else
  if [[ -z "${TANDAZA_DEMO_SSH_PASSWORD:-}" ]]; then
    read -r -s -p "Demo server SSH password for ${SERVER}: " TANDAZA_DEMO_SSH_PASSWORD
    echo
    export TANDAZA_DEMO_SSH_PASSWORD
  fi
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "sshpass is required for password deployment when no deploy key exists." >&2
    echo "Install it or restore ${DEPLOY_KEY}." >&2
    exit 1
  fi
  SSH_BASE=(sshpass -e ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
  RSYNC_SSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new"
fi

run_remote() {
  "${SSH_BASE[@]}" "$SERVER" "$1"
}

echo "Tandaza demo deployment"
echo "Server: ${SERVER}"
echo "Bare repo: ${BARE_REPO}"
echo "Branch: ${BRANCH}"
echo "Temp clone: ${REMOTE_TMP}"
echo "Commit: ${COMMIT_MESSAGE}"
echo

cd "$ROOT_DIR"

echo "Running local checks..."
(
  cd backend
  GOCACHE="${ROOT_DIR}/.dev/go-build" go test ./internal/httpapi -run '^$'
)
(
  cd frontend
  npm run build
)

echo "Creating server-side temp clone..."
run_remote "rm -rf '${REMOTE_TMP}' && git clone '${BARE_REPO}' '${REMOTE_TMP}' && git config --global --add safe.directory '${REMOTE_TMP}' && cd '${REMOTE_TMP}' && git checkout '${BRANCH}'"

echo "Syncing project files into temp clone..."
"${RSYNC_BASE[@]}" \
  -e "$RSYNC_SSH" \
  --exclude='.git' \
  --exclude='.dev' \
  --exclude='.DS_Store' \
  --exclude='backend/.cache' \
  --exclude='backend/.dev' \
  --exclude='backend/.gocache' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/.next' \
  --exclude='frontend/.next-dev' \
  --exclude='frontend/.npm-cache' \
  --exclude='frontend/tsconfig.tsbuildinfo' \
  --exclude='website/node_modules' \
  --exclude='website/.next' \
  --exclude='website/.npm-cache' \
  "${ROOT_DIR}/" "${SERVER}:${REMOTE_TMP}/"

echo "Inspecting server-side diff..."
run_remote "git config --global --add safe.directory '${REMOTE_TMP}' && cd '${REMOTE_TMP}' && git status --short && git diff --stat"

echo "Running server-side backend compile check..."
run_remote "cd '${REMOTE_TMP}/backend' && GOCACHE='${REMOTE_TMP}/.gocache' go test ./internal/httpapi -run '^$'"

echo "Committing and pushing..."
run_remote "git config --global --add safe.directory '${REMOTE_TMP}' && cd '${REMOTE_TMP}' && if git diff --quiet && git diff --cached --quiet; then echo 'No changes to deploy.'; else git add . && git commit -m \"${COMMIT_MESSAGE//\"/\\\"}\" && git push origin '${BRANCH}'; fi"

echo "Checking deployed services..."
run_remote "systemctl is-active tandaza-backend.service && systemctl is-active tandaza-frontend.service"
run_remote "curl -sS -i --max-time 10 -H 'X-Forwarded-Proto: https' http://127.0.0.1:8091/health | head -20"

echo
echo "Tandaza demo deploy command finished."
echo "Frontend: https://demo.tandaza.africa"
echo "Backend:  https://api.demo.tandaza.africa"
