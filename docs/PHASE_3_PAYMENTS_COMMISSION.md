# Phase 3: Payments And Commission

Phase 3 starts the money layer for Tandaza without adding unnecessary gateway complexity too early.

## Implemented Scope

- Added payment repository methods to the Go store contract.
- Added memory and PostgreSQL support for payments.
- Added exhibitor one-off activation payment creation.
- Added simulated Paystack-style provider references for local development.
- Added production-aware Paystack checkout initialization for provider mode.
- Added payment confirmation.
- Added signed Paystack webhook confirmation for `charge.success`.
- Added organizer commission split creation when an activation payment is confirmed.
- Added admin payment listing.
- Added organizer payment listing and receipts for expos they own.
- Added exhibitor payment listing and receipts for their own payments.
- Added derived admin and organizer settlement/accrual views.
- Added payment and commission seed data for the demo expo.
- Added audit logs for payment initialization and confirmation.
- Added backend tests for exhibitor activation payment and unauthorized role protection.

## New Backend Endpoints

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/admin/payments` | administrator | Review platform payments |
| `GET` | `/api/v1/admin/settlements` | administrator | Review commission accruals pending manual payout |
| `GET` | `/api/v1/organizer/payments` | organizer | View payments for owned expos |
| `GET` | `/api/v1/organizer/payments/{id}/receipt` | organizer | View receipt for an owned-expo payment |
| `GET` | `/api/v1/organizer/settlements` | organizer | View commission accruals for owned expos |
| `GET` | `/api/v1/exhibitor/payments` | exhibitor | View own payment history |
| `GET` | `/api/v1/exhibitor/payments/{id}/receipt` | exhibitor | View own payment receipt |
| `POST` | `/api/v1/exhibitor/expos/{id}/activation-payments` | exhibitor | Initialize one-off expo activation payment |
| `POST` | `/api/v1/exhibitor/payments/paystack/verify` | exhibitor | Verify Paystack callback reference using admin database settings |
| `POST` | `/api/v1/exhibitor/payments/{id}/confirm` | exhibitor | Local simulated-mode confirmation only |
| `POST` | `/api/v1/payments/paystack/webhook` | provider webhook | Confirm signed Paystack `charge.success` events |

## Payment Rule

exhibitor workspace payment remains offline. Tandaza payment is a separate one-off activation/add-on fee for the platform value around the expo.

The activation amount comes from the expo:

- activation fee
- currency
- organizer commission percentage

Admins set these values during Expo Core.

## Commission Rule

When an exhibitor activation payment becomes `paid`, Tandaza calculates:

- gross payment
- organizer commission
- platform retained amount

Commission formula:

```text
organizer commission = gross payment * organizer commission percentage
platform retained amount = gross payment - organizer commission
```

Example:

```text
KES 5,000 activation fee
30% organizer commission
Organizer earns KES 1,500
Platform keeps KES 3,500
```

## Current Gateway Strategy

The backend now supports production-aware Paystack initialization when `PAYMENT_MODE=provider` or production Paystack credentials are configured. In provider mode, payments are confirmed by signed Paystack webhook only. Local/demo mode can still use simulated confirmation for offline testing.

The webhook accepts the real Paystack shape:

```json
{
  "event": "charge.success",
  "data": {
    "reference": "pay_001",
    "status": "success"
  }
}
```

It also accepts the older local test shape with `paymentId` for compatibility.

## Out Of Scope

Reserved for the next payment slices:

- payout/disbursement execution
- gateway reconciliation dashboards
