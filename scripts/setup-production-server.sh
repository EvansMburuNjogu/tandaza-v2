#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${TANDAZA_PROD_HOST:-89.117.48.31}"
SERVER_USER="${TANDAZA_PROD_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_HOST}"
APP_ROOT="${TANDAZA_PROD_ROOT:-/opt/tandaza-production}"
BRANCH="${TANDAZA_PROD_BRANCH:-production}"
DEPLOY_KEY="${TANDAZA_PROD_SSH_KEY:-.dev/tandaza_production_deploy_key}"

if [[ ! -f "$DEPLOY_KEY" ]]; then
  mkdir -p "$(dirname "$DEPLOY_KEY")"
  ssh-keygen -t ed25519 -f "$DEPLOY_KEY" -N "" -C "tandaza-production-deploy" >/dev/null
fi

if [[ -z "${TANDAZA_PROD_SSH_PASSWORD:-}" ]]; then
  read -r -s -p "Production server SSH password for ${SERVER}: " TANDAZA_PROD_SSH_PASSWORD
  echo
fi

if ! command -v expect >/dev/null 2>&1; then
  echo "Missing required command: expect" >&2
  exit 1
fi

PUB_KEY="$(cat "${DEPLOY_KEY}.pub")"
POSTGRES_PASSWORD="${TANDAZA_PROD_POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"
MINIO_USER="${TANDAZA_PROD_MINIO_USER:-tandaza_prod}"
MINIO_PASSWORD="${TANDAZA_PROD_MINIO_PASSWORD:-$(openssl rand -hex 24)}"
JWT_SECRET="${TANDAZA_PROD_JWT_SECRET:-$(openssl rand -hex 32)}"
PII_ENCRYPTION_KEY="${TANDAZA_PROD_PII_ENCRYPTION_KEY:-$(openssl rand -hex 32)}"
FRONTEND_URL="${TANDAZA_PROD_FRONTEND_URL:-https://tandaza.africa}"
API_URL="${TANDAZA_PROD_API_URL:-https://api.tandaza.africa}"
MEDIA_URL="${TANDAZA_PROD_MEDIA_URL:-}"
ADMIN_EMAIL="${TANDAZA_PROD_ADMIN_EMAIL:-admin@tandaza.africa}"
ADMIN_PASSWORD="${TANDAZA_PROD_ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '=+/')}"

EXPECT_SERVER="$SERVER" \
EXPECT_PASSWORD="$TANDAZA_PROD_SSH_PASSWORD" \
EXPECT_PUB_KEY="$PUB_KEY" \
EXPECT_APP_ROOT="$APP_ROOT" \
EXPECT_BRANCH="$BRANCH" \
expect -c '
  set timeout 60
  set server $env(EXPECT_SERVER)
  set password $env(EXPECT_PASSWORD)
  set pubkey $env(EXPECT_PUB_KEY)
  set app_root $env(EXPECT_APP_ROOT)
  set branch $env(EXPECT_BRANCH)
  spawn ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new $server "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && grep -qxF \"$pubkey\" ~/.ssh/authorized_keys || echo \"$pubkey\" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && mkdir -p $app_root/env $app_root/app $app_root/repo.git && if test ! -d $app_root/repo.git/objects; then git init --bare $app_root/repo.git; fi && git --git-dir=$app_root/repo.git symbolic-ref HEAD refs/heads/$branch"
  expect "*password:*" { send "$password\r"; exp_continue } eof
'

HOOK_FILE="$(mktemp)"
cat > "$HOOK_FILE" <<HOOK
#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT}"
BRANCH="${BRANCH}"
read oldrev newrev refname
if [ "\$refname" != "refs/heads/\$BRANCH" ]; then
  echo "Ignoring \$refname; deploy branch is \$BRANCH"
  exit 0
fi

mkdir -p "\$APP_ROOT/app"
git --work-tree="\$APP_ROOT/app" --git-dir="\$APP_ROOT/repo.git" checkout -f "\$BRANCH"
cp "\$APP_ROOT/app/deploy/production/docker-compose.yml" "\$APP_ROOT/docker-compose.yml"
cd "\$APP_ROOT"
docker compose build
docker compose up -d --remove-orphans
docker compose ps
HOOK

scp -i "$DEPLOY_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$HOOK_FILE" "${SERVER}:${APP_ROOT}/repo.git/hooks/post-receive"
rm -f "$HOOK_FILE"
ssh -i "$DEPLOY_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SERVER" "chmod +x '${APP_ROOT}/repo.git/hooks/post-receive'"

ssh -i "$DEPLOY_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SERVER" "cat > ${APP_ROOT}/env/postgres.env <<'EOF'
POSTGRES_DB=tandaza
POSTGRES_USER=tandaza
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOF
cat > ${APP_ROOT}/env/minio.env <<'EOF'
MINIO_ROOT_USER=${MINIO_USER}
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
MINIO_REGION_NAME=us-east-1
MINIO_UPDATE=off
EOF
cat > ${APP_ROOT}/env/backend.env <<'EOF'
APP_ENV=production
PORT=8080
FRONTEND_URL=${FRONTEND_URL}
DATABASE_MODE=postgres
DATABASE_URL=postgres://tandaza:${POSTGRES_PASSWORD}@postgres:5432/tandaza?sslmode=disable
JWT_SECRET=${JWT_SECRET}
TOKEN_TTL_HOURS=168
LOG_LEVEL=info
EXPO_LIFECYCLE_WORKER_ENABLED=true
EXPO_LIFECYCLE_INTERVAL_SECONDS=3600
STORAGE_DRIVER=s3
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=${MINIO_USER}
S3_SECRET_KEY=${MINIO_PASSWORD}
S3_BUCKET=tandaza-media
S3_REGION=us-east-1
S3_PUBLIC_URL=${MEDIA_URL}
S3_FORCE_PATH_STYLE=true
PII_ENCRYPTION_KEY=${PII_ENCRYPTION_KEY}
BOOTSTRAP_ADMIN_EMAIL=${ADMIN_EMAIL}
BOOTSTRAP_ADMIN_PASSWORD=${ADMIN_PASSWORD}
BOOTSTRAP_ADMIN_NAME=Platform Administrator
BOOTSTRAP_ADMIN_COMPANY=Tandaza
EOF
cat > ${APP_ROOT}/env/frontend.env <<'EOF'
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_API_BASE_URL=${API_URL}
API_BASE_URL=http://backend:8080
FRONTEND_URL=${FRONTEND_URL}
NEXT_PUBLIC_FRONTEND_URL=${FRONTEND_URL}
EOF
chmod 600 ${APP_ROOT}/env/*.env"

echo "Production server prepared."
echo "Bare repo: ${SERVER}:${APP_ROOT}/repo.git"
echo "Deploy branch: ${BRANCH}"
echo "Deploy key: ${DEPLOY_KEY}"
echo "Bootstrap admin: ${ADMIN_EMAIL}"
echo "Bootstrap admin password is stored in ${APP_ROOT}/env/backend.env on the server."
