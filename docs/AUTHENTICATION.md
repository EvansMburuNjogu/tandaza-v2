# Authentication

Tandaza uses two authentication styles:

- Public auth endpoints use HTTP Basic authentication.
- Protected application endpoints use Bearer tokens returned by login or email verification.

JSON credential bodies are still accepted on auth endpoints as a temporary frontend compatibility bridge. New clients should use Basic auth for the public auth endpoints.

## Public Auth Endpoints

### Login

`POST /api/v1/auth/login`

Use Basic auth where the username is the email and the password is the account password.

```bash
curl -u admin@tandaza.demo:admin123 \
  http://localhost:8080/api/v1/auth/login
```

Response:

```json
{
  "token": "bearer-token",
  "user": {
    "id": "usr_admin_001",
    "name": "Platform Administrator",
    "email": "admin@tandaza.demo",
    "role": "administrator"
  },
  "redirectTo": "/administrator"
}
```

### Register

`POST /api/v1/auth/register`

Use Basic auth where the username is the new user's email and the password is their chosen password. Send profile fields in JSON.

```bash
curl -u visitor@example.com:strong-password \
  -H "Content-Type: application/json" \
  -d '{"name":"Remote Visitor","role":"visitor","countryCode":"KE"}' \
  http://localhost:8080/api/v1/auth/register
```

Allowed self-registration roles are visitor and sponsorship. Organizer, exhibitor, and administrator accounts are created through controlled platform workflows.

Registration sends an email verification link and does not create a browser session until the user verifies their email.

### Verify Email

`POST /api/v1/auth/verify-email`

Use Basic auth where the username is the verification token from the emailed link. The password value is ignored.

```bash
curl -u ver_123456789:anything \
  http://localhost:8080/api/v1/auth/verify-email
```

The response matches login and includes the bearer token and role-aware redirect.

### Forgot Password

`POST /api/v1/auth/forgot-password`

Use Basic auth where the username is the account email. The password value is ignored.

```bash
curl -u visitor@tandaza.demo:anything \
  http://localhost:8080/api/v1/auth/forgot-password
```

The backend queues and attempts an email notification containing a reset link. Local memory/demo responses may include the reset token and link for deterministic tests; the frontend does not expose token entry to users.

### Reset Password

`POST /api/v1/auth/reset-password`

Use Basic auth where the username is the reset token and the password is the new account password.

```bash
curl -u rst_123456789:new-password \
  http://localhost:8080/api/v1/auth/reset-password
```

## Protected Endpoints

Pass the login or email-verification token using a Bearer token:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/auth/me
```

Admin and organizer expo endpoints enforce role authorization in addition to token validation.
