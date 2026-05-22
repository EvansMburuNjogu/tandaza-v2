# Phase 2: Expo Core

Phase 2 makes the expo the real system object across backend, database, and frontend.

## Implemented Scope

- Replaced the old backend direction with a Go backend.
- Added PostgreSQL support with a migration runner using `pgx`.
- Added memory mode for fast local development and tests.
- Added seed data for countries, currencies, categories, demo users, and a demo expo.
- Added admin and organizer Expo Core endpoints.
- Added the real lifecycle statuses for expos.
- Added admin-controlled activation fee and organizer commission fields.
- Added audit logs for expo creation, updates, status movement, pricing changes, login/logout, registration, and password reset activity.
- Added request app logs for runtime diagnostics.
- Wired frontend admin/organizer expo screens to the HTTP API through the Go-backed contract.
- Removed the legacy frontend dummy API mode after backend compatibility endpoints were added.

## Role Rules

Organizers can:

- create their own expo drafts
- edit only their own `draft` or `needs_changes` expos
- submit their own expo for review
- view their own expos

Admins can:

- create expos
- edit expo details
- set activation fee
- set organizer commission basis points
- approve, publish, mark live/completed, and archive expos
- review audit and app logs

Visitors, exhibitors, and sponsors cannot mutate admin or organizer expo resources in this phase.

## Out Of Scope

These are deliberately reserved for later phases:

- Paystack integration
- exhibitor activation payments
- commission ledger and payouts
- QR code scanning
- lead capture and engagement
- visitor timeline beyond placeholder screens
- notifications
- sponsorships and ads
- analytics reports

## Data Model Notes

The Phase 2 expo includes:

- country
- city
- venue
- timezone
- currency
- categories
- activation fee displayed as normal currency values while the backend keeps provider-safe internal amounts
- organizer commission in basis points
- lifecycle status
- start and end dates

The database already includes forward-looking tables for payments, commissions, QR, leads, meetings, notifications, products, and visitor timeline events so later phases can extend without a disruptive schema reset.
