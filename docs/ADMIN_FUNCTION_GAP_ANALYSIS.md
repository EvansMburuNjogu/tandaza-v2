# Admin Function Gap Analysis

This compares the current administrator console with the Tandaza admin command-center model: operations, revenue, messaging, and control.

## Summary

The admin account is no longer just a login role. It currently has backend-backed access to the major platform surfaces: expos, accounts, payments, settlements, notifications, reports, settings, audit logs, and app logs. The main gap is not visibility; it is controlled mutation for workflows that still need backend endpoints, such as settlement approval, notification retry, ad approval, refund handling, and more granular security controls.

## Current Coverage

| Area | Current Admin Functions | Status |
|---|---|---|
| Operations | Expo create/edit/status, organizer accounts, exhibitor accounts, visitor visibility, profile detail pages | Strong |
| Revenue | Payments, settlements, sponsors, sponsor plans, ads, reports | Partial |
| Messaging | Notification delivery list/detail, provider attempts, email/SMS settings | Partial |
| Control | System users, role/status updates, settings, audit logs, app logs, security headers and PII hardening | Strong |

## Gaps To Add Later

| Area | Missing Function | Backend Needed |
|---|---|---|
| Operations | Approval queues for organizers, exhibitors, and stalled expos | Dedicated status/action endpoints |
| Operations | Expo readiness score before publishing/live | Readiness summary endpoint |
| Revenue | Settlement approve/reject/disburse actions | Settlement mutation endpoints |
| Revenue | Refunds, failed payment resolution, provider reconciliation | Payment adjustment and reconciliation endpoints |
| Revenue | Ad approval/rejection and moderation | Ad status mutation endpoints |
| Messaging | Retry notification, test send, template editing | Notification retry/template endpoints |
| Control | Active session revocation and admin permission scopes | Session and permission endpoints |
| Control | Security event dashboard | Auth/security event aggregation endpoint |

## Frontend Alignment Completed

- Admin navigation is grouped into Operations, Revenue, Messaging, and Control.
- The administrator overview now shows function coverage and next gaps without creating fake actions.
- Unsupported row actions remain hidden until backend mutation endpoints exist.
- Admin account creation and role/status edits remain connected to real backend user APIs.

## Recommendation

Keep the admin model strict: admin has final platform control, but the frontend should only show mutation controls when the backend can actually enforce them and record audit logs. Visibility can arrive earlier; action buttons should arrive only with matching authorization, validation, audit logging, and tests.
