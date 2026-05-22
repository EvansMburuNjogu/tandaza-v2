# Tandaza Go Backend

Phase 1 replaces the previous Node backend with an expo-centered Go API foundation.

## Current Phase

Implemented now:

- standard-library Go HTTP API
- health and readiness endpoints
- demo login and session lookup
- public auth endpoints with HTTP Basic authentication for login/register/forgot/reset
- role redirects aligned with the frontend
- country/currency foundation for Africa-wide scaling
- expo activation fee and organizer commission model
- admin overview stub for frontend HTTP mode
- Expo Core APIs for admin and organizer list/detail/create/edit/status workflows
- optional PostgreSQL store with migration runner via `DATABASE_MODE=postgres`
- structured app logs for requests/runtime diagnostics
- audit logs for security and business actions
- core PostgreSQL schema migration
- password reset recovery migration
- exhibitor activation payments and organizer commission splits
- visitor remote expo access, QR records, timeline activity, and lead capture
- notification queueing, SMTP email templates, TiaraConnect SMS, realtime/push hooks, delivery attempts, and analytics reports
- sponsorship plans, campaigns, ads, sponsor payments, and sponsor reports
- unit tests for auth, HTTP, and commission calculations

## Documentation

- [API reference](../docs/API.md)
- [Authentication contract](../docs/AUTHENTICATION.md)
- [Local development](../docs/LOCAL_DEVELOPMENT.md)
- [Notifications](../docs/NOTIFICATIONS.md)
- [Final Backend Hardening](../docs/FINAL_BACKEND_HARDENING.md)
- [Security](../docs/SECURITY.md)
- [Phase 2 Expo Core](../docs/PHASE_2_EXPO_CORE.md)
- [Phase 3 Payments And Commission](../docs/PHASE_3_PAYMENTS_COMMISSION.md)
- [Phase 4 Visitor, QR And Leads](../docs/PHASE_4_VISITOR_QR_LEADS.md)
- [Phase 5 Notifications And Analytics](../docs/PHASE_5_NOTIFICATIONS_ANALYTICS.md)
- [Phase 6 Sponsorships And Ads](../docs/PHASE_6_SPONSORSHIPS_ADS.md)
- [Dynamic Data Policy](../docs/DYNAMIC_DATA_POLICY.md)
- [Implementation log](../docs/IMPLEMENTATION_LOG.md)

## Run

```bash
go run ./cmd/api
```

The API listens on `:8080` by default.

Use `DATABASE_MODE=postgres` to run against PostgreSQL and apply migrations at startup. The root `./scripts/dev-run.sh` uses PostgreSQL by default so local admin data persists across restarts. `DATABASE_MODE=memory` remains available only for temporary demos and fast isolated checks.

To run the Go API and Next.js frontend together from the repo root:

```bash
./scripts/dev-run.sh
```

Use `./scripts/dev-stop.sh` to stop runner-managed background services and `./scripts/dev-status.sh` to inspect ports and logs.

## Test

```bash
go test ./...
```

## Phase Roadmap

1. Go foundation: auth, roles, health, countries, currencies, expo pricing model.
2. Expo core: organizer drafts, admin approval, categories, publication lifecycle.
3. Payments and commission: Paystack provider, idempotent webhooks, organizer commission, manual payouts.
4. Visitor, QR and leads: remote access, workspace QR scans, visitor timeline, product interest, lead management.
5. Notifications and analytics: email, SMS, push, post-expo reports, daily metrics.
6. Sponsorships and ads: package inventory, category sponsorships, sponsor reports.

## Architecture Direction

This starts as a modular monolith. The future split points are payments, notifications, analytics ingestion, reporting, and media storage.
