# Phase 6: Sponsorships And Ads

Phase 6 adds the backend and database foundation for sponsorship packages and ad placements.

## Implemented Scope

- Added sponsor plan, campaign, ad, sponsor payment, and sponsor dashboard domain models.
- Added memory and PostgreSQL store methods for sponsorship and ad data.
- Added PostgreSQL migration for sponsor plans, sponsor campaigns, sponsor ads, indexes, and seed data.
- Added admin sponsor plan endpoint.
- Added admin ad review endpoint.
- Added sponsor dashboard endpoint.
- Added sponsor reports endpoint.
- Added sponsor campaign list/detail/create endpoints.
- Added sponsor ad list/detail/create endpoints.
- Added sponsor payment list and receipt endpoints.
- Added sponsor ad payment initialization and confirmation endpoints.
- Added public ad impression/click tracking endpoint for active ads.
- Added backend tests for sponsor plans, campaign creation, ad creation, dashboard metrics, and admin ad review.

## New Backend Endpoints

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/sponsor-plans` | administrator | List sponsor packages |
| `GET` | `/api/v1/admin/ads` | administrator | Review sponsor/exhibitor ad inventory |
| `GET` | `/api/v1/sponsor/dashboard` | sponsorship | Sponsor dashboard metrics |
| `GET` | `/api/v1/sponsor/reports` | sponsorship | Sponsor performance reports |
| `GET` | `/api/v1/sponsor/campaigns` | sponsorship | List sponsor campaigns |
| `POST` | `/api/v1/sponsor/campaigns` | sponsorship | Create campaign |
| `GET` | `/api/v1/sponsor/campaigns/{id}` | sponsorship | View campaign |
| `GET` | `/api/v1/sponsor/ads` | sponsorship | List sponsor ads |
| `POST` | `/api/v1/sponsor/ads` | sponsorship | Create sponsor ad |
| `GET` | `/api/v1/sponsor/ads/{id}` | sponsorship | View sponsor ad |
| `POST` | `/api/v1/sponsor/ads/{id}/payments` | sponsorship | Initialize ad placement payment |
| `POST` | `/api/v1/sponsor/payments/{id}/confirm` | sponsorship | Local simulated-mode confirmation only; provider mode uses Paystack webhook |
| `GET` | `/api/v1/sponsor/payments` | sponsorship | List sponsor payments |
| `GET` | `/api/v1/sponsor/payments/{id}/receipt` | sponsorship | View sponsor payment receipt |
| `POST` | `/api/v1/ads/{id}/track` | public | Record an active ad impression or click |

## Data Model

Sponsor plans define what the platform sells.

Sponsor campaigns group sponsor objectives and budgets.

Sponsor ads hold the actual placement:

- banner
- sidebar
- popup
- video

Each ad tracks:

- budget
- daily spend
- impressions
- clicks
- CTR
- campaign
- payment status
- review/display status

## Current Limitations

- Local mode can simulate Paystack confirmation; provider mode redirects to Paystack and completes through signed webhook verification.
- Paid ads move to `draft` as an admin-review state; admin still controls final activation or rejection.
- Tracking only accepts active ads and records aggregate impressions/clicks; fraud controls and placement-level attribution remain future scope.
