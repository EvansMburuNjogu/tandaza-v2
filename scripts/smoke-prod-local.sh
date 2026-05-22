#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@tandaza.demo}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
EXPECT_DATABASE_MODE="${EXPECT_DATABASE_MODE:-postgres}"
EXPECT_STORAGE_DRIVER="${EXPECT_STORAGE_DRIVER:-s3}"

TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
MEDIA_FILE="$TMP_DIR/smoke.png"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() {
  echo "✓ $1"
}

fail() {
  echo "✗ $1"
  exit 1
}

json_field() {
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const path=process.argv[1].split('.'); let v=data; for (const p of path) v=v?.[p]; if (v===undefined || v===null) process.exit(1); process.stdout.write(String(v));" "$1"
}

json_field_optional() {
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const path=process.argv[1].split('.'); let v=data; for (const p of path) v=v?.[p]; if (v===undefined || v===null) process.exit(0); process.stdout.write(String(v));" "$1"
}

request_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "$url" -H "Content-Type: application/json" --data "$data"
  else
    curl -fsS -X "$method" "$url"
  fi
}

require_url() {
  local label="$1"
  local url="$2"
  curl -fsS "$url" >/dev/null || fail "$label is not reachable at $url"
  pass "$label reachable"
}

require_url "Backend ready" "$BACKEND_URL/ready"
require_url "Frontend login" "$FRONTEND_URL/login"

READY_JSON="$(curl -fsS "$BACKEND_URL/ready")"
DATABASE_MODE="$(printf '%s' "$READY_JSON" | json_field databaseMode)"
STORAGE_DRIVER="$(printf '%s' "$READY_JSON" | json_field storageDriver)"
[[ "$DATABASE_MODE" == "$EXPECT_DATABASE_MODE" ]] || fail "Expected database mode $EXPECT_DATABASE_MODE, got $DATABASE_MODE"
[[ "$STORAGE_DRIVER" == "$EXPECT_STORAGE_DRIVER" ]] || fail "Expected storage driver $EXPECT_STORAGE_DRIVER, got $STORAGE_DRIVER"
pass "Readiness metadata confirms ${DATABASE_MODE}/${STORAGE_DRIVER}"

LOGIN_RESPONSE="$(curl -fsS -c "$COOKIE_JAR" -X POST "$FRONTEND_URL/api/auth/login" -H "Content-Type: application/json" --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
ADMIN_ROLE="$(printf '%s' "$LOGIN_RESPONSE" | json_field user.role)"
[[ "$ADMIN_ROLE" == "administrator" || "$ADMIN_ROLE" == "super_administrator" ]] || fail "Admin login returned role $ADMIN_ROLE"
pass "Admin login through frontend proxy"

ADMIN_API_RESPONSE="$(curl -fsS -X POST "$BACKEND_URL/api/v1/auth/login" -H "Content-Type: application/json" --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
ADMIN_TOKEN="$(printf '%s' "$ADMIN_API_RESPONSE" | json_field token)"
pass "Admin backend token available for API smoke checks"

for path in \
  "/api/v1/admin/overview?country=KE" \
  "/api/v1/admin/expos?country=KE" \
  "/api/v1/admin/organizers?country=KE" \
  "/api/v1/admin/exhibitors?country=KE" \
  "/api/v1/admin/visitors?country=KE" \
  "/api/v1/admin/payments?country=KE" \
  "/api/v1/admin/settlements?country=KE" \
  "/api/v1/admin/sponsor-plans?country=KE" \
  "/api/v1/admin/ads?country=KE" \
  "/api/v1/admin/notifications" \
  "/api/v1/admin/audit-logs"; do
  curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" "$BACKEND_URL$path" >/dev/null || fail "Admin endpoint failed: $path"
done
pass "Admin country/global endpoints reachable"

VISITOR_EMAIL="smoke.visitor.$(date +%s)@tandaza.demo"
REGISTER_RESPONSE="$(curl -fsS -X POST "$FRONTEND_URL/api/auth/register" -H "Content-Type: application/json" --data "{\"name\":\"Smoke Visitor\",\"email\":\"$VISITOR_EMAIL\",\"password\":\"visitor456\",\"confirmPassword\":\"visitor456\",\"role\":\"visitor\",\"countryCode\":\"KE\"}")"
VERIFY_LINK="$(printf '%s' "$REGISTER_RESPONSE" | json_field_optional verificationLink)"
if [[ -n "$VERIFY_LINK" ]]; then
  VERIFY_TOKEN="${VERIFY_LINK##*token=}"
  VERIFY_TOKEN="${VERIFY_TOKEN%%&*}"
  curl -fsS -X POST "$FRONTEND_URL/api/auth/verify-email" -H "Content-Type: application/json" --data "{\"token\":\"$VERIFY_TOKEN\"}" >/dev/null || fail "Visitor email verification failed"
  pass "Visitor registration and email verification"
else
  pass "Visitor registration accepted; verification link is not exposed in this mode"
fi

for creds in \
  "organizer@tandaza.demo:organizer123:/api/v1/organizer/overview" \
  "exhibitor@tandaza.demo:exhibitor123:/api/v1/exhibitor/overview" \
  "sponsorship@tandaza.demo:sponsorship123:/api/v1/sponsor/dashboard" \
  "$VISITOR_EMAIL:visitor456:/api/v1/visitor/dashboard"; do
  IFS=":" read -r email password path <<< "$creds"
  response="$(curl -fsS -X POST "$BACKEND_URL/api/v1/auth/login" -H "Content-Type: application/json" --data "{\"email\":\"$email\",\"password\":\"$password\"}")"
  token="$(printf '%s' "$response" | json_field token)"
  curl -fsS -H "Authorization: Bearer $token" "$BACKEND_URL$path" >/dev/null || fail "Role dashboard failed for $email"
done
pass "Organizer, exhibitor, sponsor, and visitor dashboards reachable"

printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\xe2&\x85\x00\x00\x00\x00IEND\xaeB`\x82' > "$MEDIA_FILE"
UPLOAD_RESPONSE="$(curl -fsS -X POST "$BACKEND_URL/api/v1/media" -H "Authorization: Bearer $ADMIN_TOKEN" -F "file=@$MEDIA_FILE;type=image/png")"
MEDIA_URL="$(printf '%s' "$UPLOAD_RESPONSE" | json_field url)"
[[ -n "$MEDIA_URL" ]] || fail "Media upload did not return a URL"
pass "Media upload returned URL: $MEDIA_URL"

curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" "$BACKEND_URL/api/v1/admin/reports?country=KE" >/dev/null || fail "Admin reports failed"
pass "Reports reachable"

echo
echo "Tandaza production-local smoke passed."
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
