# Final Backend Hardening

This pass closes the backend gaps needed before frontend finalization.

## Added

- Admin-managed SMTP email settings.
- Admin-managed TiaraConnect SMS settings.
- Visitor Google login/signup endpoint.
- TiaraConnect response field persistence in delivery attempts.
- Full backend journey test covering Google visitor auth, expo lifecycle, exhibitor activation, visitor booking, lead capture, notification dispatch, and reporting.

## Admin Settings

Email:

- `GET /api/v1/admin/settings/email`
- `PATCH /api/v1/admin/settings/email`

SMS:

- `GET /api/v1/admin/settings/sms`
- `PATCH /api/v1/admin/settings/sms`

Settings are stored in PostgreSQL `app_settings` and memory mode. Environment variables remain useful for local defaults, but admin/database settings are the runtime source for notification provider dispatch.

## Google Visitor Auth

Endpoint:

`POST /api/v1/auth/google`

Production expects a Google ID token and verifies it through Google token info. Development/test mode can accept a profile payload for deterministic local tests.

The backend always creates or returns a `visitor` account. Google auth does not create organizer, exhibitor, sponsor, or administrator accounts.
