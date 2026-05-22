# Exhibitor Account

## Product Promise

The exhibitor account is built around one selling point: every expo visitor should become a trackable sales opportunity.

The exhibitor does not browse all expos. They only see expos where an administrator or the owning organizer has assigned or invited them to a workspace.

## Journey

1. An administrator or organizer assigns the exhibitor to an expo and records workspace number, workspace label, and assignment status.
2. The exhibitor logs in and completes the company profile.
3. The exhibitor pays the one-off digital workspace activation fee for that assigned expo.
4. Payment confirmation activates that expo workspace.
5. The exhibitor manages QR, leads, products, meetings, pre-order intent, visitors, analytics, and receipts inside the workspace.
6. After the expo, the exhibitor follows up on leads using status, temperature, notes, next follow-up date, and recorded activities.

## Current Backend Functions

| Function | Endpoint | Status |
| --- | --- | --- |
| Admin assigns exhibitor to expo | `POST /api/v1/admin/exhibitor-assignments` | Done |
| Organizer assigns exhibitor to owned expo | `POST /api/v1/organizer/exhibitor-assignments` | Done |
| Exhibitor sees assigned expos only | `GET /api/v1/expos/available` | Done |
| digital workspace activation payment | `POST /api/v1/exhibitor/expos/{id}/activation-payments` | Done |
| Payment confirmation activates workspace | `POST /api/v1/exhibitor/payments/{id}/confirm` | Done |
| Company profile save | `PATCH /api/v1/exhibitor/profile` | Done |
| QR code load/create | `GET /api/v1/exhibitor/expos/{id}/qrcode` | Done |
| Product catalog CRUD | `GET/POST/PATCH /api/v1/exhibitor/products` | Done |
| Lead CRM updates | `PATCH /api/v1/exhibitor/leads/{id}` | Done |
| Follow-up activity records | `POST /api/v1/exhibitor/leads/{id}/activities` | Done |
| Saved CRM follow-up messages | `POST /api/v1/exhibitor/leads/{id}/messages` | Done |
| Lead CSV export | `GET /api/v1/exhibitor/expos/{id}/leads/export` | Done |
| Downloadable QR SVG | `GET /api/v1/exhibitor/expos/{id}/qrcode.svg` | Done |
| Media upload | `POST /api/v1/media` | Done |
| workspace boost creation | `POST /api/v1/exhibitor/expos/{id}/ads` | Done |
| Visitor interest, meeting request, and pre-order intent | `POST /api/v1/exhibitor/expos/{id}/leads` | Done |

## Current Frontend Functions

| Area | Status |
| --- | --- |
| Action-first exhibitor dashboard | Done |
| Assigned expo activation screen | Done |
| Expo workspace tabs | Done |
| QR tab with backend QR target | Done |
| Lead CRM filters and row actions | Done |
| Lead CSV export | Done |
| CRM email/SMS/WhatsApp queue actions | Done |
| Product catalog pages | Done |
| Product/profile/boost media upload | Done |
| Profile/settings save through backend | Done |
| Ads/boosts | Create/list v1 done; payment/approval workflow remains future scope |

## Audit Coverage

The backend records audit logs for exhibitor assignment, workspace activation payment initialization/confirmation, QR creation, product mutations, lead creation, lead CRM updates, lead follow-up activities, meeting requests, pre-order intents, and profile updates.

## Future Scope

- Team permissions inside exhibitor accounts.
- Live payment and approval workflow for exhibitor workspace boosts.
- Actual provider dispatch from CRM follow-up messages after notification workers/provider credentials are live.
- Deep calendar scheduling with availability, accept/reject, and reminders.
- Full pre-order checkout, inventory reservation, invoices, and fulfillment.
