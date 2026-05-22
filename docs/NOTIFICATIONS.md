# Notifications

Tandaza notifications are provider-aware and must be saved before and after delivery.

## Channels

- `email`: delivered through SMTP using branded HTML templates.
- `sms`: delivered through TiaraConnect.
- `push`: delivered to a configurable push webhook.
- `in_app`: saved in Tandaza and optionally broadcast through a realtime webhook.
- `whatsapp`: reserved for a later provider integration.

## SMTP Email

Configure SMTP in Admin Settings. The same values can be seeded from environment variables for local development, but the runtime dispatcher reads the admin/database settings. Provider settings do not store separate status flags; delivery becomes available when the admin has saved usable provider credentials.

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-user
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=notifications@tandaza.africa
SMTP_FROM_NAME=Tandaza
SMTP_ENCRYPTION=starttls
```

Supported encryption values are `starttls`, `tls`/`ssl`, and `none`. Meeting confirmations and reminders use the same admin SMTP settings as the rest of the platform.

Email notifications render a responsive HTML template with:

- Tandaza brand header
- subject/title
- expo-aware message body
- call-to-action button
- footer explaining why the user received the email

Supported template keys currently include:

- `expo_remote_access_booked`
- `new_lead_captured`
- `expo_daily_digest`
- `expo_reminder`
- `general_notice`

The notification payload can override:

```json
{
  "subject": "Expo reminder",
  "title": "Your expo starts tomorrow",
  "message": "Review your timeline and remote access.",
  "ctaLabel": "Open Expo",
  "ctaUrl": "https://app.tandaza.africa/visitor/expos/expo_001",
  "expoName": "Nairobi Tech Expo"
}
```

## TiaraConnect SMS

Configure TiaraConnect in Admin Settings. The same values can be seeded from environment variables for local development.

```bash
TIARA_API_KEY=your-api-key
TIARA_SENDER_ID=CONNECT
TIARA_BASE_URL=https://api2.tiaraconnect.io
```

The backend sends SMS using:

```bash
POST https://api2.tiaraconnect.io/api/messaging/sendsms
Authorization: Bearer <API-KEY>
Content-Type: application/json
```

Payload:

```json
{
  "from": "CONNECT",
  "to": "2547XXXXXXXX",
  "message": "Test SMS",
  "refId": "ntf_001"
}
```

For SMS notifications, include the phone number in `payload.phone` or `payload.to`.

## Realtime And Push

Push notifications use `PUSH_WEBHOOK_URL`.

In-app realtime notifications use `REALTIME_WEBHOOK_URL` when configured. If no realtime webhook is configured, Tandaza still saves the in-app notification and marks it as sent because it is available inside the app.

## Delivery Persistence

Every notification is stored in `notifications`.

Every delivery attempt is stored in `notification_delivery_attempts` with:

- notification id
- channel
- provider
- sent/failed status
- provider request payload
- provider response payload
- failure reason
- timestamp

If SMTP, TiaraConnect, or push credentials are missing, the attempt is saved as `failed` with a clear reason. The system does not silently pretend an external provider delivered the notification.

TiaraConnect response fields such as `cost`, `mnc`, `balance`, `msgId`, `to`, `mcc`, `desc`, `status`, and `statusCode` are preserved inside `response_payload`.

Administrators can inspect persisted attempts through:

`GET /api/v1/admin/notifications/{id}/attempts`

## Background Dispatch

Production should enable the built-in dispatcher:

```bash
NOTIFICATION_WORKER_ENABLED=true
NOTIFICATION_DISPATCH_INTERVAL_SECONDS=60
```

When enabled, the Go API dispatches due queued notifications on startup and then on the configured interval. Each dispatch stores provider attempts, updates notification status, and writes an audit log when work is processed.

If the worker is disabled, administrators can still manually dispatch due notifications through:

`POST /api/v1/admin/notifications/dispatch-due`

## Meeting Reminders

When an exhibitor schedules a visitor meeting, Tandaza queues reminder notifications at:

- 30 minutes before the meeting
- 5 minutes before the meeting
- 1 minute before the meeting

Logged-in platform users connected to the meeting receive email, in-app/browser, and push notification records. CC-only invitees receive email notifications because they do not have a Tandaza user id for browser or push delivery.

Meeting email delivery uses the exact target email saved in the notification payload. This prevents a joined account record from overriding a CC, visitor, or team-member recipient during SMTP dispatch.
