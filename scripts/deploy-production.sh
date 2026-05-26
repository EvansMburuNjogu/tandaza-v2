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
FRONTEND_URL="${TANDAZA_PROD_FRONTEND_URL:-https://tandaza.africa}"
API_URL="${TANDAZA_PROD_API_URL:-https://api.tandaza.africa}"
MEDIA_URL="${TANDAZA_PROD_MEDIA_URL:-https://media.tandaza.africa}"

RUN_TESTS=1
RUN_FRONTEND_BUILD=1
RUN_PUBLIC_CHECKS=1
ALLOW_SELF_SIGNED_PUBLIC_CHECKS="${TANDAZA_ALLOW_SELF_SIGNED_PUBLIC_CHECKS:-0}"
ALLOW_DIRTY=0

usage() {
  cat <<EOF
Usage: ./scripts/deploy-production.sh [options]

Deploy Tandaza to production through the bare Git repository on the server.

Options:
  --skip-tests          Skip backend compile/test check
  --skip-build          Skip local frontend build
  --no-public-checks    Skip public HTTPS smoke checks
  --allow-self-signed-public-checks
                        Allow public smoke checks to ignore certificate validation
  --allow-dirty         Allow deploy with uncommitted local changes
  -h, --help            Show this help

Environment overrides:
  TANDAZA_PROD_HOST       Default: 89.117.48.31
  TANDAZA_PROD_USER       Default: root
  TANDAZA_PROD_ROOT       Default: /opt/tandaza-production
  TANDAZA_PROD_BRANCH     Default: production
  TANDAZA_PROD_SSH_KEY    Default: .dev/tandaza_production_deploy_key
  TANDAZA_ALLOW_SELF_SIGNED_PUBLIC_CHECKS
                          Set to 1 to pass -k to public smoke-check curl calls
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)
      RUN_TESTS=0
      ;;
    --skip-build)
      RUN_FRONTEND_BUILD=0
      ;;
    --no-public-checks)
      RUN_PUBLIC_CHECKS=0
      ;;
    --allow-self-signed-public-checks)
      ALLOW_SELF_SIGNED_PUBLIC_CHECKS=1
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

log() {
  printf '\n==> %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_node_20_9() {
  local label="$1"
  local version
  version="$(node -p "process.versions.node" 2>/dev/null || true)"
  if [[ -z "$version" ]]; then
    echo "Missing required command for $label: node" >&2
    exit 1
  fi
  node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 20 || (major === 20 && minor >= 9) ? 0 : 1)" || {
    echo "$label requires Node.js 20.9.0 or newer for Next.js 16. Current version: $version" >&2
    exit 1
  }
}

public_smoke_check() {
  local method="$1"
  local label="$2"
  local url="$3"
  local curl_args=(-fsS --max-time 20)

  if [[ "$method" == "HEAD" ]]; then
    curl_args=(-fsSI --max-time 20)
  fi

  if [[ "$ALLOW_SELF_SIGNED_PUBLIC_CHECKS" == "1" ]]; then
    curl_args=(-k "${curl_args[@]}")
  fi

  printf 'Checking %-8s %s\n' "$label" "$url"
  if ! curl "${curl_args[@]}" "$url" >/dev/null; then
    echo "Public smoke check failed for $label: $url" >&2
    echo "If this is a real certificate error, fix DNS/Cloudflare/SSL before launch." >&2
    echo "If you are intentionally testing through a self-signed/intercepted certificate, rerun with:" >&2
    echo "  ./scripts/deploy-production.sh --allow-self-signed-public-checks" >&2
    exit 1
  fi
}

cd "$ROOT_DIR"

require_command git
require_command ssh
require_command curl

if [[ ! -f "$DEPLOY_KEY" ]]; then
  echo "Missing deploy key: $DEPLOY_KEY" >&2
  echo "Run ./scripts/setup-production-server.sh first." >&2
  exit 1
fi

if [[ "$ALLOW_DIRTY" != "1" && -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Working tree has uncommitted tracked changes." >&2
  echo "Commit them first, or rerun with --allow-dirty if this is intentional." >&2
  git status --short --untracked-files=no
  exit 1
fi

CURRENT_SHA="$(git rev-parse --short HEAD)"
SSH_OPTS=(-i "$DEPLOY_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)

log "Production target"
echo "Server:       $SERVER"
echo "App root:     $APP_ROOT"
echo "Bare repo:    $BARE_REPO"
echo "Branch:       $BRANCH"
echo "Commit:       $CURRENT_SHA"
echo "Frontend URL: $FRONTEND_URL"
echo "API URL:      $API_URL"
echo "Media URL:    $MEDIA_URL"

log "Checking production server"
ssh "${SSH_OPTS[@]}" "$SERVER" "test -d '$BARE_REPO' && test -x '$BARE_REPO/hooks/post-receive' && docker --version >/dev/null && docker compose version >/dev/null"

if [[ "$RUN_TESTS" == "1" ]]; then
  log "Running backend compile check"
  (cd backend && GOCACHE="${ROOT_DIR}/.dev/go-build" go test ./internal/httpapi -run '^$')
else
  log "Skipping backend check"
fi

if [[ "$RUN_FRONTEND_BUILD" == "1" ]]; then
  log "Running frontend build"
  require_node_20_9 "Local frontend build"
  (cd frontend && npm run build)
else
  log "Skipping frontend build"
fi

log "Pushing to production bare repo"
GIT_SSH_COMMAND="ssh -i ${DEPLOY_KEY} -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new" \
  git push "ssh://$SERVER$BARE_REPO" "HEAD:refs/heads/$BRANCH"

log "Waiting for production services"
ssh "${SSH_OPTS[@]}" "$SERVER" "bash -lc '
  set -euo pipefail
  cd \"$APP_ROOT/app\"
  docker compose -f deploy/production/docker-compose.yml ps
  echo

  wait_for_url() {
    local label=\"\$1\"
    local method=\"\$2\"
    local url=\"\$3\"
    local attempt
    for attempt in \$(seq 1 36); do
      if [[ \"\$method\" == \"HEAD\" ]]; then
        if curl -fsSI --max-time 10 \"\$url\" >/dev/null; then
          echo \"\$label is reachable\"
          return 0
        fi
      else
        if curl -fsS --max-time 10 \"\$url\" >/dev/null; then
          echo \"\$label is reachable\"
          return 0
        fi
      fi
      sleep 5
    done
    echo \"\$label did not become reachable: \$url\" >&2
    return 1
  }

  wait_for_url Backend GET http://127.0.0.1:8095/health
  wait_for_url Frontend HEAD http://127.0.0.1:3210/login
  wait_for_url Media HEAD http://127.0.0.1:9010/minio/health/live
'"

if [[ "$RUN_PUBLIC_CHECKS" == "1" ]]; then
  log "Running public HTTPS smoke checks"
  if [[ "$ALLOW_SELF_SIGNED_PUBLIC_CHECKS" == "1" ]]; then
    echo "Certificate verification is disabled for public smoke checks only."
  fi
  public_smoke_check HEAD "Frontend" "$FRONTEND_URL/login"
  public_smoke_check GET "API" "$API_URL/health"
  public_smoke_check HEAD "Media" "$MEDIA_URL/minio/health/live"
else
  log "Skipping public HTTPS checks"
fi

log "Deployment complete"
echo "Tandaza production is ready."
echo "Frontend: $FRONTEND_URL/login"
echo "Backend:  $API_URL"
echo "Media:    $MEDIA_URL"
