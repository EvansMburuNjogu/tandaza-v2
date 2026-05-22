# Tandaza Admin Functions

This document defines what the administrator account should see, control, and benefit from in Tandaza. The admin is the platform owner role: it protects quality, revenue, compliance, security, and operational continuity across all expos.

## Admin Role Principle

The administrator should have final control over platform-wide actions. Organizers can request, manage, and operate their expo spaces, but the administrator approves sensitive platform actions such as publishing expos, pricing activation, commission rules, account control, settlement readiness, provider configuration, and security policy.

Admin actions must be backend-enforced, audited, and permission-checked. The frontend should not show a mutation button unless the backend can validate the action and write an audit log.

## Current Admin Navigation

| Section | Screens |
|---|---|
| Country Operations | Country Overview, Expos, Organizers, Exhibitors, Visitors |
| Country Revenue | Reports & Analytics, Payments, Settlements, Sponsors, Sponsor Plans, Ads |
| Global Platform | Global Functions, System Users, Notifications, Audit Logs, Categories, Countries, Settings |

Country Operations and Country Revenue screens use the admin country switcher. Switching from Kenya to Ghana refetches the backend using `country=GH`, so payments, settlements, expos, account lists, sponsor plans, ads, overview, and reports show the selected country's data. Global Platform screens remain cross-country because they control platform-wide security, logs, categories, countries, and provider configuration.

## Operations Functions

| Function | Admin Value | Current Status |
|---|---|---|
| Platform overview | See operational health from one place | Available |
| Expo management | Create, review, approve, publish, mark live, complete, archive expos | Available for expo core |
| Expo pricing | Set activation fee, currency, and organizer commission | Available in backend model |
| Organizer management | Create/view/edit organizer accounts and monitor organizer readiness | Available |
| Exhibitor management | View and manage exhibitor profiles and participation context | Available |
| Visitor management | View visitor accounts and engagement context | Available |
| Country/currency/category control | Support multi-country expo scaling | Country and category creation available |
| Approval queues | Prioritize pending expo/account actions | Later improvement |
| Expo readiness checks | Prevent poor-quality expos from going live | Later improvement |

## Revenue Functions

| Function | Admin Value | Current Status |
|---|---|---|
| Payments visibility | Review payments across exhibitors, sponsors, and platform activity | Available |
| Settlement visibility | Track organizer commission exposure and payout readiness | Available |
| Sponsor management | Manage sponsor accounts and sponsor participation | Available |
| Sponsor plan management | Configure sponsor tiers, pricing, and benefits | Available |
| Ads visibility | Inspect exhibitor and sponsor ad activity | Available |
| Reports and analytics | See revenue, engagement, and growth performance | Available |
| Settlement approval/disbursement | Approve, reject, and release organizer payouts | Available |
| Refund/reconciliation tools | Resolve failed, cancelled, or refunded provider transactions | Available |
| Ad moderation | Approve, reject, or pause ads | Available |

## Messaging Functions

| Function | Admin Value | Current Status |
|---|---|---|
| Notification history | See all sent, pending, and failed notifications | Available |
| Delivery attempts | Inspect SMTP, SMS, push, and realtime provider responses | Available |
| Email configuration | Configure SMTP from admin settings, with controlled encryption mode and no separate stored status | Available |
| SMS configuration | Configure TiaraConnect sender and credentials without a separate status toggle | Available |
| Paystack configuration | Configure payment provider keys and callbacks without a separate status toggle | Available |
| WhatsApp configuration | Configure WhatsApp provider settings without a separate status toggle | Available |
| Notification templates | Control branded email/SMS content | Backend/template editing still needed |
| Test send | Validate provider settings before live use | Available |
| Retry failed notifications | Recover failed delivery attempts | Available |

## Control Functions

| Function | Admin Value | Current Status |
|---|---|---|
| System user management | Add and manage internal super administrator and administrator accounts | Available |
| Role and status control | Activate, suspend, or edit controlled admin access; system-user roles are limited to super administrator and administrator | Available |
| Audit logs | Trace important platform mutations | Available |
| App logs | Inspect operational logs and failures | Backend support exists |
| PII protection | Protect sensitive user data at rest and in transit | Backend support exists |
| Bootstrap admin | Start a new environment from `.env` admin credentials | Available |
| Security headers and HTTPS enforcement | Improve transport/browser security posture | Backend support exists |
| Session revocation | Force logout compromised accounts | Later improvement |
| Permission scopes | Split admin, finance, support, and operations permissions | Later improvement |
| Security event dashboard | View suspicious auth and access events | Later improvement |

## Administrator User Journey

1. Admin logs in with a protected administrator account.
2. Admin lands on the overview and sees platform health, revenue signals, and pending operational work.
3. Admin reviews submitted expos and validates location, category, dates, pricing, and commission.
4. Admin approves or requests changes, then publishes and marks expos live when ready.
5. Admin monitors exhibitors, visitors, sponsors, payments, notifications, and settlements during the expo lifecycle.
6. Admin checks reports after the expo and uses audit logs to verify important actions.
7. Admin manages platform settings, communication providers, system users, and security controls.
8. When a newly created system user signs in with a temporary password, Tandaza forces a password change before opening the admin console.

## What Admin Should Not Do

The administrator should not perform organizer-owned day-to-day expo work unless support requires it. The admin should control platform policy, approval, safety, monetization, and escalation. This keeps the platform scalable instead of making Tandaza staff manually operate every expo.

## Priority Roadmap

| Priority | Work |
|---|---|
| P0 | Keep login/session stable, backend-backed pages only, no dummy admin actions |
| P1 | Complete expo approval, pricing, commission, and audit visibility |
| P1 | Complete admin account creation and account status enforcement |
| P1 | Complete payments, settlements, notifications, and reports visibility |
| P2 | Add editable notification templates |
| P2 | Add deeper provider reconciliation dashboards |
| P2 | Add deeper settlement payout provider tracking |
| P3 | Add admin permission scopes and active session revocation |
| P3 | Add security event dashboard and provider reconciliation tools |

## Implementation Rule

Every admin mutation must include:

- role authorization
- request validation
- database persistence
- audit log entry
- clear frontend success/error state
- test coverage for allowed and denied roles
