# Security

This document captures the backend controls added for administrator access and PII protection.

## Admin User Management

Administrators can create users, including new administrator accounts.

Endpoints:

- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`

`POST /api/v1/admin/users` is administrator-only and accepts:

```json
{
  "name": "Security Admin",
  "email": "security.admin@tandaza.demo",
  "password": "strong-password",
  "role": "administrator",
  "companyName": "Tandaza",
  "countryCode": "KE",
  "status": "active"
}
```

Every admin-created user is audit logged as `admin_user_created`.

## Bootstrap Admin

Production and fresh environments can create the first administrator from environment variables:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_NAME` defaults to `Platform Administrator`
- `BOOTSTRAP_ADMIN_COMPANY` defaults to `Tandaza`

At API startup, Tandaza creates the bootstrap administrator only if no active account exists with that email. If the email already belongs to an administrator, startup continues without changing the password. If the email belongs to a non-admin user, startup fails so the platform cannot silently elevate an existing account.

Successful creation is audit logged as `bootstrap_admin_created`. The password is never written to audit logs or app logs.

## Password Storage

New passwords are stored with PBKDF2-SHA256 using a random salt and 210,000 iterations.

Legacy demo passwords with the `demo:` prefix remain readable only for seeded local accounts and migration compatibility. New registrations, resets, and admin-created users use the stronger hash format.

## PII At Rest

Set `PII_ENCRYPTION_KEY` in production.

When configured, newly written user PII is protected as follows:

- email lookup uses a keyed HMAC hash in `email_hash`
- email is encrypted into `email_cipher`
- name is encrypted into `name_cipher`
- company name is encrypted into `company_name_cipher`
- placeholder values are kept in the original text columns so existing constraints and joins keep working

The API decrypts user PII before returning authorized responses.

Existing seed/demo rows remain plaintext until a migration/backfill is run with the production key. Do not run production without setting `PII_ENCRYPTION_KEY`.

## PII In Transit

Set `ENFORCE_HTTPS=true` behind a trusted proxy or TLS terminator.

When enabled, requests must be HTTPS or include `X-Forwarded-Proto: https`; otherwise the API returns `426 Upgrade Required`.

Security headers include:

- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Content-Security-Policy`

## Production Notes

- Terminate TLS at the load balancer or API gateway.
- Ensure the proxy forwards `X-Forwarded-Proto`.
- Store `PII_ENCRYPTION_KEY`, JWT secret, SMTP credentials, TiaraConnect key, Google credentials, and Paystack credentials in a secret manager.
- Rotate secrets with a planned re-encryption/backfill procedure.
