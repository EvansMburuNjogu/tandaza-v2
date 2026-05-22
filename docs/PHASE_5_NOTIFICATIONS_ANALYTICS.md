# Phase 5: Notifications And Analytics

Phase 5 completes the backend foundation for notifications, reminders, and reports.

The goal is to make Tandaza measurable and follow-up ready before spending more time on frontend polish.

## Implemented Scope

- Added notification domain models and store methods.
- Added memory and PostgreSQL notification repositories.
- Added notification seed migration.
- Added admin notification listing.
- Added admin notification queueing.
- Added admin dispatch for due queued notifications.
- Added admin reports derived from real backend data.
- Added organizer reports derived from owned expos, payments, and leads.
- Added backend tests for queueing, dispatch, notification listing, admin reports, and organizer reports.

## New Backend Endpoints

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/notifications` | administrator | View notification delivery log |
| `POST` | `/api/v1/admin/notifications` | administrator | Queue a notification/reminder |
| `POST` | `/api/v1/admin/notifications/dispatch-due` | administrator | Mark due queued notifications as sent |
| `GET` | `/api/v1/admin/reports` | administrator | Platform analytics summary |
| `GET` | `/api/v1/organizer/reports` | organizer | Organizer expo analytics summary |

## Notification Model

Notifications support:

- user recipient
- expo context
- role
- channel: email, SMS, push, WhatsApp, or in-app
- template key
- JSON payload
- queued/sent/delivered/failed/cancelled lifecycle
- scheduled dispatch time
- sent timestamp
- failure reason

The current dispatcher is intentionally simple: it marks due queued notifications as `sent`. The next backend slice can attach actual providers.

## Analytics Model

Reports are currently derived from operational tables:

- expos
- payments
- leads
- notifications
- visitor activity

Admin reports include:

- published/live expos
- paid activation volume
- captured leads
- delivered notifications
- revenue series
- engagement series
- generated insights

Organizer reports include:

- owned expos
- activation revenue
- leads captured
- paid exhibitors
- revenue series
- engagement series
- visitor demographics placeholder based on lead activity

## Out Of Scope

Reserved for future backend slices:

- actual email/SMS/push/WhatsApp provider integrations
- notification retries and dead-letter handling
- user notification preferences enforcement
- scheduled worker process
- dedicated analytics warehouse
- event aggregation rollups
- CSV/PDF report export generation
