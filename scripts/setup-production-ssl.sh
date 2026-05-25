#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_HOST="${TANDAZA_PROD_HOST:-89.117.48.31}"
SERVER_USER="${TANDAZA_PROD_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_HOST}"
DEPLOY_KEY="${TANDAZA_PROD_SSH_KEY:-${ROOT_DIR}/.dev/tandaza_production_deploy_key}"
CERT_NAME="${TANDAZA_PROD_CERT_NAME:-tandaza.africa}"
CERT_EMAIL="${TANDAZA_PROD_CERT_EMAIL:-info@tandaza.africa}"

DOMAINS=(
  tandaza.africa
  www.tandaza.africa
  api.tandaza.africa
  media.tandaza.africa
  console.media.tandaza.africa
)

usage() {
  cat <<EOF
Usage: ./scripts/setup-production-ssl.sh [options]

Issue the Tandaza production SSL certificate once using Certbot.

This script is intentionally separate from deploy-production.sh so normal
deployments do not reissue certificates or touch other hosted applications.
If the certificate already exists on the server, the script exits without
running Certbot.

Options:
  --force-renew       Run certbot renew for the existing certificate
  -h, --help          Show this help

Environment overrides:
  TANDAZA_PROD_HOST       Default: 89.117.48.31
  TANDAZA_PROD_USER       Default: root
  TANDAZA_PROD_SSH_KEY    Default: <repo>/.dev/tandaza_production_deploy_key
  TANDAZA_PROD_CERT_NAME  Default: tandaza.africa
  TANDAZA_PROD_CERT_EMAIL Default: info@tandaza.africa
EOF
}

FORCE_RENEW=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-renew)
      FORCE_RENEW=1
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

if [[ ! -f "$DEPLOY_KEY" ]]; then
  echo "Missing deploy key: $DEPLOY_KEY" >&2
  echo "Run ./scripts/setup-production-server.sh first." >&2
  exit 1
fi

domain_args=()
for domain in "${DOMAINS[@]}"; do
  domain_args+=("-d" "$domain")
done

remote_domains=""
printf -v remote_domains " %q" "${domain_args[@]}"

ssh -i "$DEPLOY_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$SERVER" "bash -lc '
  set -euo pipefail

  cert_path=\"/etc/letsencrypt/live/${CERT_NAME}/fullchain.pem\"

  if ! command -v certbot >/dev/null 2>&1; then
    echo \"Installing Certbot and Nginx plugin...\"
    if command -v dnf >/dev/null 2>&1; then
      dnf install -y certbot python3-certbot-nginx
    elif command -v yum >/dev/null 2>&1; then
      yum install -y certbot python3-certbot-nginx
    elif command -v apt-get >/dev/null 2>&1; then
      apt-get update
      apt-get install -y certbot python3-certbot-nginx
    else
      echo \"Could not install Certbot automatically. Install certbot and python3-certbot-nginx first.\" >&2
      exit 1
    fi
  fi

  if [[ -f \"\$cert_path\" && \"${FORCE_RENEW}\" != \"1\" ]]; then
    echo \"SSL certificate already exists: \$cert_path\"
    certbot certificates --cert-name \"${CERT_NAME}\" || true
    echo \"Skipping Certbot issuance. Use --force-renew only when renewal is required.\"
    exit 0
  fi

  if [[ \"${FORCE_RENEW}\" == \"1\" ]]; then
    echo \"Running Certbot renewal for ${CERT_NAME}...\"
    certbot renew --cert-name \"${CERT_NAME}\" --deploy-hook \"systemctl reload nginx\"
  else
    echo \"Issuing Tandaza production certificate with Certbot...\"
    certbot --nginx --non-interactive --agree-tos --redirect \
      --email \"${CERT_EMAIL}\" --cert-name \"${CERT_NAME}\"${remote_domains}
  fi

  nginx -t
  systemctl reload nginx
  certbot certificates --cert-name \"${CERT_NAME}\" || true
'"

echo "Production SSL setup complete."
