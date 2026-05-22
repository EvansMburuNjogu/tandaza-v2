# Phase 4: Visitor, QR And Leads

Phase 4 starts Tandaza's remote expo access layer.

The goal is simple: a visitor should be able to engage with an expo remotely, open exhibitor workspaces through QR/links, leave contact interest, and give exhibitors a usable lead trail.

## Implemented Scope

- Added visitor expo discovery backed by the Go API.
- Added visitor expo detail access and timeline activity tracking.
- Added visitor expo workspace detail with active exhibitor workspaces and expo-scoped product catalogs.
- Added visitor remote booking with a generated visitor QR string.
- Added exhibitor "my expos" from activated expo exhibitor records.
- Added exhibitor workspace QR generation and lookup.
- Added public QR resolution endpoint.
- Added visitor lead capture against an exhibitor workspace.
- Added a visitor-native action endpoint for interest, meeting request, and pre-order intent.
- Added exhibitor lead listing.
- Added visitor dashboard and timeline endpoints.
- Added PostgreSQL seed migration for QR, visitor activity, and a demo lead.
- Added backend tests for remote access, booking, QR, lead capture, lead visibility, and timeline activity.

## New Backend Endpoints

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/expos/available` | exhibitor | Browse expos open for activation |
| `GET` | `/api/v1/exhibitor/my-expos` | exhibitor | View activated expo exhibitor workspaces |
| `GET` | `/api/v1/exhibitor/expos/{id}/qrcode` | exhibitor | Create or load workspace QR code |
| `GET` | `/api/v1/exhibitor/expos/{id}/leads` | exhibitor | View leads for own workspace in an expo |
| `POST` | `/api/v1/exhibitor/expos/{id}/leads` | visitor | Leave contact interest for an exhibitor workspace |
| `POST` | `/api/v1/visitor/expos/{id}/actions?exhibitor={id}` | visitor | Share interest, request a meeting, or submit pre-order intent |
| `GET` | `/api/v1/qr/{code}` | public, optional visitor token | Resolve QR target |
| `GET` | `/api/v1/visitor/dashboard` | visitor | Visitor dashboard summary |
| `GET` | `/api/v1/visitor/expos` | visitor | Browse published/live expos remotely |
| `GET` | `/api/v1/visitor/expos/{id}` | visitor | View expo details and record timeline activity |
| `POST` | `/api/v1/visitor/expos/{id}/book` | visitor | Book remote expo access |
| `GET` | `/api/v1/visitor/bookings` | visitor | View visitor bookings |
| `GET` | `/api/v1/visitor/timeline` | visitor | View activity timeline |

## Visitor Journey

1. Visitor logs in.
2. Visitor opens published/live expos.
3. Visitor books remote access.
4. Visitor opens an expo detail or scans a workspace QR.
5. Visitor sees active exhibitor workspaces and product catalogs.
6. Visitor shares interest, requests a meeting, or submits pre-order intent.
7. Tandaza records timeline activity and creates an exhibitor-visible lead.

## Exhibitor Journey

1. Exhibitor pays the one-off activation fee from Phase 3.
2. Confirmed payment activates an expo exhibitor record.
3. Exhibitor opens their expo dashboard.
4. Exhibitor generates or views the workspace QR code.
5. Visitor scans/opens the QR target and submits interest.
6. Exhibitor sees the captured lead.

## Current Limitations

- QR output is a data record and target URL, not yet a rendered QR image download.
- The old exhibitor-named lead URL remains for compatibility, but frontend visitor actions now use `/api/v1/visitor/expos/{id}/actions`.
- Visitor bookings remain legacy remote-access records; the current frontend focuses on expo workspace engagement instead of bookings or tickets.
- Pre-order and meeting actions currently create lead records for exhibitor follow-up; full checkout and calendar scheduling remain later slices.
