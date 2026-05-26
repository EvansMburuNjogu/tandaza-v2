# API Reference

Base URL in local development: `http://localhost:8080`

## Pagination

Collection endpoints accept `page` and `pageSize` query parameters.

- `page` defaults to `1`.
- `pageSize` defaults to `25`.
- `pageSize` is capped at `100`.

Paginated responses use this envelope:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 25,
  "total": 120,
  "totalPages": 5
}
```

Admin table endpoints that include dashboard cards keep the same shape and add pagination metadata beside `stats`:

```json
{
  "stats": [],
  "items": [],
  "page": 1,
  "pageSize": 25,
  "total": 120,
  "totalPages": 5
}
```

## Country Scope

Country-scoped administrator endpoints accept `country=KE|GH|NG|ZA` and return only data for that market. Omitting `country`, or passing `country=ALL`, returns the cross-country platform view.

Currently country-scoped admin collections include overview, reports, expos, organizers, exhibitors, visitors, sponsors, sponsor plans, ads, payments, and settlements. Global platform collections such as system users, categories, audit logs, notifications, email, WhatsApp, and Paystack settings remain global.

## Public

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Process health check |
| `GET` | `/ready` | None | Runtime readiness check |
| `GET` | `/api/v1/roadmap` | None | Backend phase roadmap |
| `POST` | `/api/v1/auth/login` | Basic | Login and return bearer token |
| `POST` | `/api/v1/auth/register` | Basic | Self-register visitor and send verification email |
| `POST` | `/api/v1/auth/verify-email` | Basic | Verify email and return bearer token |
| `POST` | `/api/v1/auth/forgot-password` | Basic | Email a password reset link |
| `POST` | `/api/v1/auth/reset-password` | Basic | Reset password using emailed reset token |
| `POST` | `/api/v1/auth/google` | Google ID token | Visitor login/signup with Google |
| `GET` | `/api/v1/auth/google/config` | None | Return enabled Google visitor auth client ID |
| `GET` | `/api/v1/platform/countries` | None | Countries configured for expo scale |
| `GET` | `/api/v1/platform/currencies` | None | Supported currencies |
| `GET` | `/api/v1/categories` | None | Expo categories |
| `GET` | `/api/v1/meeting-categories` | None | Active global meeting category types used by visitor meeting scheduling |
| `GET` | `/api/v1/expos` | None | Public expo collection placeholder |
| `GET` | `/uploads/{file}` | None | Serve locally uploaded media files |

## Authenticated

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/logout` | Any authenticated user | Record logout audit event |
| `GET` | `/api/v1/auth/me` | Any authenticated user | Return current user profile |
| `POST` | `/api/v1/auth/change-password` | Any authenticated user | Change password after login; required for new admin users with temporary passwords |
| `POST` | `/api/v1/media` | Any authenticated user | Upload image, PDF, or MP4 media and receive a reusable media URL |

## Admin Expo Core

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/admin/expos?country=KE` | List expos, optionally scoped by country |
| `GET` | `/api/v1/admin/expos/{id}` | View one expo |
| `POST` | `/api/v1/admin/expos` | Create an expo |
| `PATCH` | `/api/v1/admin/expos/{id}` | Update expo details, activation fee, and commission |
| `PATCH` | `/api/v1/admin/expos/{id}/status` | Move expo through admin-controlled lifecycle states |
| `GET` | `/api/v1/admin/overview?country=KE` | Admin dashboard summary, optionally scoped by country |
| `GET` | `/api/v1/admin/audit-logs` | Security/business audit trail |
| `GET` | `/api/v1/admin/app-logs` | Runtime request log trail |
| `GET` | `/api/v1/admin/users` | List platform users |
| `POST` | `/api/v1/admin/users` | Create a system user with `super_administrator` or `administrator` role and queue a welcome email with the temporary password |
| `PATCH` | `/api/v1/admin/users/{id}` | Update a system user; roles are limited to `super_administrator` and `administrator` |
| `POST` | `/api/v1/admin/categories` | Create a global expo category |
| `POST` | `/api/v1/admin/countries` | Onboard a country market with default currency and timezone |
| `GET` | `/api/v1/admin/settings/email` | Load SMTP email settings. Provider settings do not include persisted status flags. |
| `PATCH` | `/api/v1/admin/settings/email` | Update SMTP email settings: sender, host, port, credentials, and encryption mode |
| `GET` | `/api/v1/admin/settings/sms` | Load TiaraConnect SMS settings without status flag |
| `PATCH` | `/api/v1/admin/settings/sms` | Update TiaraConnect sender and credentials |
| `GET` | `/api/v1/admin/settings/paystack` | Load Paystack keys, callback URL, and processing-fee percentage without status flag |
| `PATCH` | `/api/v1/admin/settings/paystack` | Update Paystack keys, callback URL, and processing-fee percentage |
| `GET` | `/api/v1/admin/settings/google` | Load Google sign-in client settings |
| `PATCH` | `/api/v1/admin/settings/google` | Update Google sign-in client settings |
| `GET` | `/api/v1/admin/settings/meeting-categories` | Load global meeting category types and Google Calendar meeting settings |
| `PATCH` | `/api/v1/admin/settings/meeting-categories` | Update meeting category types and Google Calendar service account settings for Meet link generation |
| `GET` | `/api/v1/exhibitor/settings/meeting-categories` | Load exhibitor-owned meeting category labels, falling back to global defaults |
| `PATCH` | `/api/v1/exhibitor/settings/meeting-categories` | Add/remove exhibitor-owned meeting category labels used by that company’s meeting form |
| `GET` | `/api/v1/admin/settings/openai` | Load global OpenAI analytics settings |
| `PATCH` | `/api/v1/admin/settings/openai` | Update OpenAI analytics enablement, model, and API key |
| `POST` | `/api/v1/admin/settings/openai/test` | Test OpenAI structured analytics generation |
| `GET` | `/api/v1/admin/settings/whatsapp` | Load WhatsApp settings without status flag |
| `PATCH` | `/api/v1/admin/settings/whatsapp` | Update WhatsApp provider credentials and webhook |
| `GET` | `/api/v1/admin/organizers?country=KE` | List organizer accounts, optionally scoped by country |
| `POST` | `/api/v1/admin/organizers` | Create organizer account |
| `PATCH` | `/api/v1/admin/organizers/{id}` | Update organizer account |
| `GET` | `/api/v1/admin/exhibitors?country=KE` | List exhibitor accounts, optionally scoped by country |
| `POST` | `/api/v1/admin/exhibitors` | Create exhibitor account |
| `PATCH` | `/api/v1/admin/exhibitors/{id}` | Update exhibitor account |
| `POST` | `/api/v1/admin/exhibitor-assignments` | Assign or update an exhibitor workspace relationship for any expo |
| `GET` | `/api/v1/admin/sponsors?country=KE` | List sponsor accounts, optionally scoped by country |
| `POST` | `/api/v1/admin/sponsors` | Create sponsor account |
| `PATCH` | `/api/v1/admin/sponsors/{id}` | Update sponsor account |
| `GET` | `/api/v1/admin/visitors?country=KE` | List visitor accounts, optionally scoped by country |
| `PATCH` | `/api/v1/admin/visitors/{id}` | Update visitor account status/details |

## Payments And Commission

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/payments?country=KE` | administrator | Review platform payment activity, optionally scoped by country |
| `PATCH` | `/api/v1/admin/payments/{id}/status` | administrator | Mark a payment failed, cancelled, or refunded after reconciliation |
| `GET` | `/api/v1/admin/settlements?country=KE` | administrator | Review commission accruals pending manual payout, optionally scoped by country |
| `PATCH` | `/api/v1/admin/settlements/{id}/status` | administrator | Approve, reject, or mark settlement disbursed |
| `GET` | `/api/v1/organizer/payments` | organizer | View payments connected to owned expos |
| `GET` | `/api/v1/organizer/payments/{id}/receipt` | organizer | View receipt for an owned-expo payment |
| `GET` | `/api/v1/organizer/settlements` | organizer | View commission accruals for owned expos |
| `GET` | `/api/v1/exhibitor/payments` | exhibitor | View own payment history |
| `GET` | `/api/v1/exhibitor/payments/{id}/receipt` | exhibitor | View own receipt |
| `POST` | `/api/v1/exhibitor/expos/{id}/activation-payments` | exhibitor | Initialize one-off activation payment. Accepts optional `paymentChannels` such as `card`, `bank`, `bank_transfer`, `ussd`, `qr`, or `mobile_money`; card is used when none are provided |
| `POST` | `/api/v1/exhibitor/payments/paystack/verify` | exhibitor | Verify Paystack callback reference using database-managed Paystack settings and activate paid workspace |
| `POST` | `/api/v1/exhibitor/payments/{id}/confirm` | exhibitor | Local simulated-mode confirmation only; provider mode uses webhook |
| `POST` | `/api/v1/payments/paystack/webhook` | provider webhook | Confirm signed Paystack `charge.success` events for exhibitor and sponsor payments |

## Visitor, QR And Leads

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/expos/available` | exhibitor | View only assigned/invited expos available for digital workspace activation |
| `POST` | `/api/v1/organizer/exhibitor-assignments` | organizer | Assign or update an exhibitor workspace relationship for an owned expo |
| `PATCH` | `/api/v1/exhibitor/profile` | exhibitor | Update exhibitor company profile |
| `GET` | `/api/v1/exhibitor/products?expoId=expo_001` | exhibitor | List own persisted product catalog, optionally scoped to one expo |
| `POST` | `/api/v1/exhibitor/products` | exhibitor | Create product catalog item for an active expo workspace |
| `GET` | `/api/v1/exhibitor/products/{id}` | exhibitor | View own product catalog item |
| `PATCH` | `/api/v1/exhibitor/products/{id}` | exhibitor | Update own product catalog item |
| `GET` | `/api/v1/exhibitor/my-expos` | exhibitor | View activated expo workspaces |
| `GET` | `/api/v1/exhibitor/expos/{id}/qrcode` | exhibitor | Create or load workspace QR code |
| `GET` | `/api/v1/exhibitor/expos/{id}/qrcode.svg` | exhibitor | Download a printable workspace QR SVG card |
| `GET` | `/api/v1/exhibitor/expos/{id}/leads` | exhibitor | View exhibitor leads for an expo |
| `GET` | `/api/v1/exhibitor/expos/{id}/leads/export` | exhibitor | Export exhibitor leads as CSV |
| `PATCH` | `/api/v1/exhibitor/leads/{id}` | exhibitor | Update lead CRM status, temperature, notes, and follow-up dates |
| `POST` | `/api/v1/exhibitor/leads/{id}/activities` | exhibitor | Record follow-up activity such as call, email, WhatsApp, meeting, or note |
| `POST` | `/api/v1/exhibitor/leads/{id}/messages` | exhibitor | Queue a saved email, SMS, or WhatsApp follow-up notification for a lead |
| `GET` | `/api/v1/exhibitor/expos/{id}/meetings` | exhibitor | List scheduled visitor meetings for the expo workspace calendar |
| `POST` | `/api/v1/exhibitor/expos/{id}/meetings` | exhibitor | Create a meeting from a lead or visitor details, invite optional `ccEmails`, and queue confirmation/reminder notifications |
| `DELETE` | `/api/v1/exhibitor/expos/{id}/meetings/{meetingId}` | exhibitor | Delete an exhibitor-owned meeting from the expo workspace calendar |
| `GET` | `/api/v1/exhibitor/expos/{id}/visitors` | exhibitor | View unique visitors derived from captured leads |
| `POST` | `/api/v1/exhibitor/expos/{id}/organizer-feedback` | exhibitor | Submit expo feedback to the organizer with rating, category, improvements, and dislikes |
| `GET` | `/api/v1/exhibitor/expos/{id}/analytics` | exhibitor | View exhibitor-only expo analytics, including investment, leads, meetings, pre-orders, realized return, and projected ROI |
| `GET` | `/api/v1/exhibitor/expos/{id}/roi` | exhibitor | View the exhibitor's saved expo-specific ROI estimate for one workspace |
| `PATCH` | `/api/v1/exhibitor/expos/{id}/roi` | exhibitor | Update expo-specific exhibitor ROI estimate, currency, spend breakdown, and notes |
| `GET` | `/api/v1/exhibitor/expos/{id}/ads` | exhibitor | List workspace boosts for the exhibitor |
| `POST` | `/api/v1/exhibitor/expos/{id}/ads` | exhibitor | Submit a workspace boost banner for approval/payment |
| `POST` | `/api/v1/exhibitor/expos/{id}/leads` | visitor | Backward-compatible visitor lead capture for an exhibitor workspace |
| `GET` | `/api/v1/qr/{code}` | public | Resolve a QR code target |
| `GET` | `/api/v1/visitor/dashboard` | visitor | Visitor dashboard summary |
| `GET` | `/api/v1/visitor/expos` | visitor | Browse remote expos |
| `GET` | `/api/v1/visitor/expos/{id}` | visitor | View expo workspace with active exhibitor workspaces and product catalogs, and record activity |
| `POST` | `/api/v1/visitor/expos/{id}/actions?exhibitor={expoExhibitorId}` | visitor | Share interest, request a meeting, or submit pre-order intent for an active exhibitor workspace |
| `POST` | `/api/v1/visitor/expos/{id}/book` | visitor | Legacy remote access record |
| `GET` | `/api/v1/visitor/bookings` | visitor | Legacy remote access records |
| `GET` | `/api/v1/visitor/timeline` | visitor | View visitor activity timeline |

## Notifications And Analytics

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notifications` | authenticated | View the signed-in user's non-cleared in-app notifications |
| `PATCH` | `/api/v1/notifications/{id}/read` | authenticated | Mark one signed-in user notification as read |
| `PATCH` | `/api/v1/notifications/read-all` | authenticated | Mark all signed-in user notifications as read |
| `DELETE` | `/api/v1/notifications/{id}` | authenticated | Clear one signed-in user notification from the topbar list |
| `GET` | `/api/v1/admin/notifications` | administrator | View notification delivery log |
| `POST` | `/api/v1/admin/notifications` | administrator | Queue notification/reminder and return rendered preview |
| `POST` | `/api/v1/admin/notifications/dispatch-due` | administrator | Dispatch due queued notifications through SMTP, TiaraConnect SMS, push, or realtime hooks |
| `POST` | `/api/v1/admin/notifications/{id}/retry` | administrator | Retry a saved notification through the configured provider |
| `POST` | `/api/v1/admin/notifications/test-send` | administrator | Queue and immediately send a provider test notification |
| `GET` | `/api/v1/admin/notifications/{id}/attempts` | administrator | View saved provider delivery attempts and responses |
| `GET` | `/api/v1/admin/reports?country=KE` | administrator | Platform analytics summary, optionally scoped by country |
| `GET` | `/api/v1/admin/reports/ai-summary?country=KE` | administrator | View latest cached AI performance summary for a country |
| `POST` | `/api/v1/admin/reports/ai-summary?country=KE` | administrator | Generate and cache a new AI performance summary for a country |
| `GET` | `/api/v1/organizer/reports` | organizer | Organizer analytics summary |
| `GET` | `/api/v1/organizer/reports/ai-summary` | organizer | View latest cached organizer AI performance summary |
| `POST` | `/api/v1/organizer/reports/ai-summary` | organizer | Generate and cache organizer AI performance summary |
| `GET` | `/api/v1/exhibitor/expos/{id}/analytics/ai-summary` | exhibitor | View latest cached AI performance summary for an expo workspace |
| `POST` | `/api/v1/exhibitor/expos/{id}/analytics/ai-summary` | exhibitor | Generate and cache AI performance summary for an expo workspace |
| `GET` | `/api/v1/sponsor/reports/ai-summary` | sponsorship | View latest cached sponsor AI performance summary |
| `POST` | `/api/v1/sponsor/reports/ai-summary` | sponsorship | Generate and cache sponsor AI performance summary |

## Sponsorships And Ads

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/sponsor-plans?country=KE` | administrator | List sponsor packages, optionally scoped by country |
| `POST` | `/api/v1/admin/sponsor-plans` | administrator | Create sponsor package |
| `GET` | `/api/v1/admin/sponsor-plans/{id}` | administrator | View sponsor package |
| `PATCH` | `/api/v1/admin/sponsor-plans/{id}` | administrator | Update sponsor package |
| `PATCH` | `/api/v1/admin/sponsor-plans/{id}/status` | administrator | Activate, deactivate, or archive sponsor package |
| `GET` | `/api/v1/admin/ads?country=KE` | administrator | Review ad inventory, optionally scoped by country |
| `PATCH` | `/api/v1/admin/ads/{id}/status` | administrator | Approve, pause, or reject ad inventory |
| `GET` | `/api/v1/sponsor/dashboard` | sponsorship | Sponsor dashboard metrics |
| `GET` | `/api/v1/sponsor/reports` | sponsorship | Sponsor performance reports |
| `GET` | `/api/v1/sponsor/campaigns` | sponsorship | List campaigns |
| `POST` | `/api/v1/sponsor/campaigns` | sponsorship | Create campaign |
| `GET` | `/api/v1/sponsor/campaigns/{id}` | sponsorship | View campaign |
| `GET` | `/api/v1/sponsor/ads` | sponsorship | List ads |
| `POST` | `/api/v1/sponsor/ads` | sponsorship | Create ad |
| `GET` | `/api/v1/sponsor/ads/{id}` | sponsorship | View ad |
| `POST` | `/api/v1/sponsor/ads/{id}/payments` | sponsorship | Initialize a one-off ad placement payment |
| `POST` | `/api/v1/sponsor/payments/{id}/confirm` | sponsorship | Local simulated-mode confirmation only; provider mode uses Paystack webhook |
| `GET` | `/api/v1/sponsor/payments` | sponsorship | List sponsor payments |
| `GET` | `/api/v1/sponsor/payments/{id}/receipt` | sponsorship | View sponsor payment receipt |
| `POST` | `/api/v1/ads/{id}/track` | public | Track an impression or click for an active ad |

## Organizer Expo Core

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/organizer/expos` | List expos owned by the organizer |
| `GET` | `/api/v1/organizer/expos/{id}` | View one owned expo |
| `POST` | `/api/v1/organizer/expos` | Create expo draft |
| `PATCH` | `/api/v1/organizer/expos/{id}` | Edit owned draft/needs-changes expo |
| `POST` | `/api/v1/organizer/expos/{id}/submit` | Submit owned draft/needs-changes expo for admin review |

## Organizer Account

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/organizer/profile` | Load organizer profile, company details, logo, payout payment method, and notification preferences |
| `PATCH` | `/api/v1/organizer/profile` | Update organizer profile, logo, payout payment method, and notification preferences |
| `GET` | `/api/v1/organizer/visitors` | List visitors who engaged with the organizer's expos, including the specific expos visited |
| `GET` | `/api/v1/organizer/feedback` | List exhibitor-submitted organizer feedback for owned expos |
| `GET` | `/api/v1/organizer/exhibitors` | List unique exhibitors assigned to the organizer's expos |
| `POST` | `/api/v1/organizer/exhibitors` | Invite an exhibitor, create their temporary-password login, and optionally assign them to an owned expo |
| `GET` | `/api/v1/organizer/team` | List organizer owner and invited team members |
| `POST` | `/api/v1/organizer/team` | Main organizer only: add an organizer team login, queue temporary password email, welcome email, and founder note |
| `GET` | `/api/v1/organizer/team/{id}` | View one organizer team member |
| `PATCH` | `/api/v1/organizer/team/{id}` | Disabled: remove and re-add team members when login details need to change |
| `DELETE` | `/api/v1/organizer/team/{id}` | Main organizer only: remove a team member and deactivate their organizer login |
| `GET` | `/api/v1/organizer/sponsors` | List sponsor relationships created by the organizer |
| `POST` | `/api/v1/organizer/sponsors` | Disabled: sponsor invitations are handled by the platform administrator |
| `GET` | `/api/v1/organizer/sponsors/{id}` | View one sponsor relationship |
| `PATCH` | `/api/v1/organizer/sponsors/{id}` | Update sponsor contact, commission rate, or status |

## Account Guide Progress

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/me/tour-progress` | authenticated | List intro guide pages already seen by the current user |
| `PATCH` | `/api/v1/me/tour-progress` | authenticated | Save intro guide completion or skip state for a page key |

## Live Stream Chat

Live stream chat is separate from permanent visitor/exhibitor conversations. It is available only while the exhibitor has enabled live stream chat for an active live stream.

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/exhibitor/expos/{id}/live-stream/chat` | exhibitor | List messages for the current active live stream chat session |
| `POST` | `/api/v1/exhibitor/expos/{id}/live-stream/chat` | exhibitor | Send a message into the active live stream chat session |
| `GET` | `/api/v1/exhibitor/expos/{id}/live-stream/chat/ws` | exhibitor | Websocket refresh channel for live stream chat |
| `GET` | `/api/v1/visitor/expos/{id}/exhibitors/{exhibitorId}/live-stream/chat` | visitor | List live stream chat messages for the visitor-facing stream |
| `POST` | `/api/v1/visitor/expos/{id}/exhibitors/{exhibitorId}/live-stream/chat` | visitor | Send a live stream chat message while chat is enabled |
| `GET` | `/api/v1/visitor/expos/{id}/exhibitors/{exhibitorId}/live-stream/chat/ws` | visitor | Websocket refresh channel for visitor live stream chat |

## Expo Lifecycle

Supported statuses:

`draft`, `submitted_for_review`, `needs_changes`, `approved`, `published`, `live`, `completed`, `settlement_pending`, `settled`, `archived`

Phase 2 exposes settlement statuses in the model but does not implement payment settlement or payout logic yet.
