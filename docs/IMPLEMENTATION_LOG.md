# Implementation Log

## Bootstrap Admin

- Added `.env`-driven bootstrap administrator support through `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.
- Bootstrap is idempotent, creates only administrator accounts, refuses non-admin email collisions, hashes the password, and records `bootstrap_admin_created` without storing the password in logs.

## Frontend Authentication

- Connected login, registration, forgot password, and reset password pages to the Go backend through Next auth route handlers.
- Moved browser session persistence to an HttpOnly `tandaza_session` cookie and added `/api/backend/[...path]` for authenticated private API proxying.
- Removed auth-page demo account shortcuts and dummy-mode messaging.
- Restricted public registration to visitor and sponsor accounts in both frontend route handling and backend registration validation.
- Added Sonner for frontend alerts and removed the old React Toastify provider.

## 2026-05-03

### Go Backend Foundation

- Removed the previous Node backend direction and created a Go API under `backend/`.
- Added health/readiness endpoints, CORS/security headers, request logging, panic recovery, and token-based session handling.
- Added memory and PostgreSQL store paths.
- Added PostgreSQL migrations and seed data for Africa-ready country/currency/category setup.
- Added audit logs and app logs as first-class backend concepts.

### Expo Core

- Implemented admin expo list/detail/create/update/status APIs.
- Implemented organizer expo list/detail/create/update/submit APIs.
- Added lifecycle statuses from draft through archived.
- Enforced organizer ownership and draft/needs-changes edit rules.
- Enforced admin-only pricing, commission, and status controls.
- Added audit logging for expo mutations and pricing/status changes.

### Frontend Alignment

- Expanded frontend expo contracts to match the real lifecycle and Phase 2 fields.
- Wired admin expo list/detail/create/edit screens to HTTP APIs.
- Wired organizer expo list/detail/create/edit/submit flow to HTTP APIs.
- Updated status badge rendering for the full expo lifecycle.
- Removed the frontend dummy API driver so browser pages use the Go-backed HTTP contract.

### Authentication Documentation Pass

- Added Basic auth support for public auth endpoints:
  - login
  - register
  - forgot password
  - reset password
- Preserved JSON credential payload compatibility for current frontend code.
- Added password reset token persistence in memory and PostgreSQL mode.
- Added API, authentication, and Phase 2 documentation under `docs/`.

### Verification

- Backend tests cover health, login/session lookup, Basic auth login, Basic auth registration, forgot/reset password, admin authorization, audit capture, organizer expo submit, admin publish, and forbidden visitor mutations.
- Frontend build was verified during Phase 2 UI integration.

### Phase 3 Payments And Commission

- Added payment methods to the Go store interface.
- Added exhibitor activation payment creation and simulated confirmation.
- Added simulated Paystack webhook confirmation.
- Added commission split creation when an activation payment is confirmed.
- Added payment list and receipt endpoints for admin, organizer, and exhibitor roles.
- Added derived settlement views for admins and organizers.
- Added PostgreSQL payment/commission seed migration.
- Added tests for payment initialization, confirmation, organizer visibility, and visitor access denial.

### Phase 4 Visitor, QR And Leads

- Added visitor remote expo discovery, detail, booking, dashboard, and timeline endpoints.
- Added exhibitor activated expo listing and workspace QR generation.
- Added public QR resolution endpoint.
- Added visitor lead capture and exhibitor lead listing.
- Added PostgreSQL migration for lead metadata, QR seed, visitor activity seed, and demo lead seed.
- Added tests for the remote visitor journey from expo access through QR/lead/timeline.

### Phase 5 Notifications And Analytics

- Added notification domain models and repository methods.
- Added memory and PostgreSQL implementations for notification queueing, listing, and due dispatch.
- Added admin notification endpoints.
- Added admin and organizer report endpoints derived from actual expo, payment, lead, and notification data.
- Added notification seed migration.
- Added tests for queueing, dispatch, notification listing, admin reports, and organizer reports.

### Phase 6 Sponsorships And Ads

- Added sponsor plan, campaign, ad, payment, and dashboard domain models.
- Added memory and PostgreSQL sponsorship/ad repositories.
- Added sponsor plan, sponsor campaign, sponsor ad, and sponsor payment endpoints.
- Added admin sponsor plan and ad review endpoints.
- Added PostgreSQL migration with sponsorship tables, indexes, and seed data.
- Added tests for sponsor plan listing, sponsor campaign creation, sponsor ad creation, sponsor dashboard, and admin ad review.

### Dynamic Data Cleanup

- Replaced hardcoded admin overview numbers with values derived from expos, countries, users, payments, and audit logs.
- Replaced fixed role distribution with counts from actual users.
- Replaced fixed admin activities with recent audit events.
- Replaced hardcoded sponsor owner labels with sponsor/user data.
- Replaced static analytics insight text with data-derived summaries.
- Removed fake settlement bank/account placeholders.

### Pagination Quality Gate

- Added `page` and `pageSize` query handling for backend collection responses.
- Added pagination metadata: `page`, `pageSize`, `total`, and `totalPages`.
- Applied pagination to public reference collections, expo lists, payments, settlements, notifications, audit/app logs, exhibitor lists, visitor lists, and sponsor lists.
- Kept frontend compatibility by unwrapping paginated `items` in the HTTP driver where pages still expect arrays.
- Documented the pagination response contract in `docs/API.md`.

### Notification Delivery Providers

- Added branded HTML email rendering for notification templates.
- Added SMTP delivery configuration for email notifications.
- Added TiaraConnect SMS delivery using `POST /api/messaging/sendsms` with bearer auth and `{from,to,message,refId}` payload.
- Added push webhook and realtime webhook delivery hooks.
- Added `notification_delivery_attempts` persistence so every external or realtime send attempt is stored.

### Frontend Backend Connectivity Cleanup

- Removed `frontend/lib/api/dummy.ts` and the old `NEXT_PUBLIC_API_DRIVER` frontend switch.
- Removed `react-toastify` and the legacy `ToastProvider`; Sonner is now the single frontend toast system.
- Removed dummy-mode UI indicators and replaced old placeholder auth language with live backend messaging.
- Added lightweight Go compatibility endpoints for existing admin, organizer, exhibitor, visitor, and sponsor pages so frontend links and HTTP calls do not fall through to 404 while deeper feature screens continue to mature.
- Wired administrator account create/edit pages to real backend user management endpoints.
- Verified frontend route hrefs and HTTP API calls against the available Next pages and Go mux routes.

### Authentication Test Pass

- Verified login through the Next auth proxy for administrator, organizer, exhibitor, sponsor, and visitor accounts.
- Verified bootstrap administrator login using `.env`-style `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` values.
- Verified public visitor and sponsor registration.
- Verified public registration rejects organizer self-signup.
- Verified forgot-password and reset-password flows, including login after password reset.
- Browser-smoked visitor login, sponsor signup, forgot password, reset password, and login with the updated password.
- Hardened login redirect handling so stale `next` URLs cannot send a user to another role's workspace before guard correction.
- Added registration email verification: new visitor/sponsor accounts now receive a verification link and only enter a workspace after verifying.
- Updated password reset so the user receives an emailed reset link and the reset page only asks for password and confirmation.
- Added confirm-password validation to registration.
- Added an admin endpoint to inspect persisted notification delivery attempts.
- Changed due dispatch to mark each notification as `sent` or `failed` based on the actual provider result.
- Added `docs/NOTIFICATIONS.md` with provider setup and template payload guidance.

### Final Backend Hardening

- Added admin/database-managed SMTP settings.
- Added admin/database-managed TiaraConnect SMS settings.
- Added visitor Google login/signup endpoint.
- Stored TiaraConnect response fields in notification delivery attempts.
- Added a full backend journey test from Google visitor auth through expo publication, activation payment, booking, lead capture, notification dispatch, and reporting.

### Security Hardening

- Added admin-only user listing and creation endpoints.
- Allowed administrators to create additional administrator users.
- Added PBKDF2-SHA256 password hashing for new registrations, resets, and admin-created users.
- Added optional PII protection for newly written user data using keyed lookup hashes and AES-GCM encrypted PII columns.
- Added HTTPS enforcement support with `ENFORCE_HTTPS=true`.
- Added security headers for API responses.
- Documented the security model in `docs/SECURITY.md`.

### Admin Account Frontend Pass

- Removed frontend-only admin row actions that only showed toast messages without calling backend mutations.
- Kept admin list actions focused on real backend-backed account workflows: view and edit.
- Removed fake visitor flag, notification retry, and settlement approval/rejection controls until backend mutations exist for those workflows.
- Replaced the inert administrator overview command button with direct links to create a system user or expo.
- Removed hardcoded expo insight mappings from admin detail helpers so visitor and engagement summaries are no longer invented from demo expo names.
- Updated backend user records to return and persist account status for admin-managed users.
- Added status validation for `active`, `inactive`, and `suspended` admin-managed accounts.
- Added backend test coverage that suspended accounts cannot complete a fresh login.

### Local Development Runner

- Added root scripts to start, stop, and inspect Tandaza backend/frontend background services.
- The runner now defaults to PostgreSQL mode and uses `127.0.0.1` for backend and frontend URLs to avoid localhost IPv6 mismatch during auth testing.
- Runner-managed logs, PID files, and the compiled local backend binary are stored in `.dev/`.
- The frontend dev runner uses `frontend/.next-dev` so production builds no longer overwrite the running Next dev cache.
- Added local development documentation with commands and demo administrator credentials.
- Added PostgreSQL preflight checks to the local runner and documented the local `tandaza` database URL.

### Admin Function Comparison

- Added an admin function gap analysis document comparing the current console to the Operations, Revenue, Messaging, and Control command-center model.
- Regrouped administrator navigation around those four operating responsibilities.
- Added administrator overview coverage cards showing what is backend-backed today and what should wait for future endpoints.
- Kept unsupported mutation controls out of the UI until matching backend action endpoints, authorization, and audit logs exist.

### Admin Session Loading Fix

- Updated guarded frontend routes to show clear session states instead of a generic loading message.
- Added direct fallback links for missing-login and wrong-role states so an auth issue does not look like a frozen admin screen.
- Documented that local auth testing must use `127.0.0.1` consistently because cookies created on `127.0.0.1` are not shared with `localhost`.

### Admin Functions Documentation

- Added `docs/ADMIN_FUNCTIONS.md` as the administrator product scope reference.
- Documented admin responsibilities across Operations, Revenue, Messaging, and Control.
- Captured current coverage, later gaps, the administrator journey, and the implementation rule for backend-enforced audited mutations.

### Dynamic Admin Account Actions

- Added backend admin mutation endpoints for organizer, exhibitor, sponsor, and visitor account management.
- Added sponsor plan create/edit/status actions with memory and PostgreSQL persistence.
- Added admin ad moderation, settlement status, notification retry/test-send, Paystack settings, and WhatsApp settings endpoints.
- Wired admin settings, sponsor plans, ads, settlements, and notifications to real HTTP actions with Sonner success/error states.
- Added sponsor plan create/detail/edit frontend pages so sidebar links no longer point at missing routes.
- Added backend tests for the new admin role account, revenue, messaging, and provider settings actions.

### Email Settings Cleanup

- Removed the persisted SMTP email status field from the Go domain model, memory store, PostgreSQL settings payload, and fresh seed data.
- Added migration `011_email_settings_no_status.sql` to strip the legacy `status` key from existing email settings JSON.
- Changed the admin Email Transport encryption control from free text to a dropdown with `STARTTLS`, `SSL/TLS`, and `None`.

### Provider Settings Cleanup

- Removed persisted status fields and editable status inputs from SMS, Paystack, and WhatsApp settings.
- Added migration `012_provider_settings_no_status.sql` to strip legacy `status` keys from existing SMS, Paystack, and WhatsApp settings JSON.
- Updated admin settings save payloads so provider tabs only submit real configuration values.
- Added helpful placeholders to each admin provider settings text input so empty forms are easier to configure.
- Removed inline auth success/error banners and routed form/page load feedback through Sonner toast notifications.

### Admin Country Context

- Added an administrator country switcher in the topbar, backed by dynamic countries from `/api/v1/platform/countries`.
- Persisted the selected admin country locally so the console remembers the operator's market context.
- Added country filtering for admin overview, reports, expos, payments, and settlements through the `country` query parameter.
- Split the administrator sidebar into country-scoped operations/revenue and global platform functions.
- Added a Global Functions page and a global Categories page, and removed SMS from global provider settings because SMS is country-scoped.

### Country-Scoped Admin Data

- Extended admin country filtering to organizers, exhibitors, visitors, sponsors, sponsor plans, and ads.
- Added country metadata to backend user, sponsor plan, and sponsor ad records so the backend can enforce country scope instead of relying on frontend-only filtering.
- Added PostgreSQL migration `013_country_scoped_sponsorship.sql` to persist sponsor plan country ownership and add country lookup indexes.
- Updated country-scoped admin create flows so new organizers, exhibitors, sponsors, sponsor plans, and expos default to the currently selected country.
- Documented the `country` query behavior in `docs/API.md` and the global-versus-country admin boundary in `docs/ADMIN_FUNCTIONS.md`.

### Global Categories And Countries

- Restored the Global Functions page as a dedicated hub with a sidebar-style menu for platform-wide links.
- Added admin-only country creation and category creation endpoints with validation, memory/PostgreSQL persistence, and audit logs.
- Added a global Countries admin page for onboarding country code, default currency, timezone, and payment methods.
- Added a create form to the global Categories page and linked Categories/Countries from Global Settings.
- Documented the new global country/category actions in the API and admin functions docs.

### Reports And Analytics Country Scope

- Removed hardcoded admin Reports & Analytics hero metrics and now derives revenue and engagement summaries from the live reports API response.
- Added country-scoped lead filtering for admin reports in memory and PostgreSQL stores.
- Scoped admin report notification counts to notifications tied to expos in the selected country.
- Standardized currency display to code-prefixed African currency output with comma thousands separators, such as `KES 5,000`, `GHS 12,500`, `NGN 1,250,000`, and `ZAR 8,000`.

### Frontend Dev Build Cache Isolation

- Changed the frontend `npm run dev` script to write development artifacts to `.next-dev` instead of `.next`.
- Updated the Tandaza local dev runner to clear stale `.next-dev` artifacts before starting the frontend it owns.
- This prevents `next dev` from loading stale server chunks after `npm run build` refreshes the production `.next` directory.

### Admin Form Placeholders

- Added meaningful placeholders to administrator account, expo, exhibitor, sponsor, and sponsor plan text inputs.
- Confirmed existing country, category, and provider settings fields already expose placeholders through their form configuration.

### Admin Input Validation

- Added reusable Sonner-based admin form validators for account, country, category, expo, sponsor plan, URL, email, and port values.
- Added native input constraints for admin text, email, password, number, currency, country code, timezone, slug, provider key, URL, phone, and payment configuration fields.
- Kept validation feedback out of inline page text; invalid submissions now stop before API calls and show toast messages.

### Countries And Categories Controls

- Changed country onboarding timezone from free text to a full timezone dropdown.
- Removed payment methods from the Countries table and added country status plus enable/disable actions backed by admin API mutations.
- Changed category icon entry from free text to a curated icon dropdown so admins pick valid category icon keys.
- Expanded the category icon catalog and render an icon preview beside selected category icon text.
- Added 50 default expo categories to memory mode and PostgreSQL migrations so the taxonomy is populated by default.
- Removed category icon controls from the admin Categories UI after review; category creation now focuses on name and slug.
- Added admin category activate/deactivate actions backed by persisted status updates and audit logs.

### Country Switcher Refresh

- Updated the admin Countries page so newly created or re-enabled countries invalidate the shared platform country cache used by the topbar switcher.
- Newly created countries are selected immediately, so country-scoped operations and revenue pages can start loading that market without a browser refresh.
- Removed the visible `All countries` option from country-scoped topbar selection; those screens now settle on an active real country, falling back to Kenya when needed.
- Replaced hardcoded country dropdowns in admin expo create/edit, organizer expo create, and public visitor/sponsor registration with active countries loaded from `/api/v1/platform/countries`.
- Expo country selection now applies the selected country's default currency and timezone from the database.
- Routed browser-side public API requests through the Next backend proxy and allowed unauthenticated proxy forwarding so the country dropdown is not blocked by backend CORS or localhost/127.0.0.1 host mismatches.
- Confirmed the country switcher and country form dropdowns use active countries only; disabled countries remain manageable from the global Countries page for re-enabling.

### Admin Sidebar Icons

- Added distinct line icons for receipts, sponsor relationships, layered sponsor plans, categories, countries, and global settings controls.
- Updated the administrator sidebar mapping so Global Functions, Categories, Countries, Settings, Sponsors, Sponsor Plans, Ads, Payments, and Settlements are easier to distinguish when scanning the menu.

### Settings Navigation

- Removed Categories and Countries from the Global Settings tab row; both remain available as standalone Global Platform sidebar pages.
- Updated the Global Settings page description so it only covers email, WhatsApp, and Paystack configuration.

### Notification Message Visibility

- Added `message` to admin notification API records, derived from the notification payload with template fallbacks.
- Added a Message column to the admin Notifications table and included message text on notification detail pages.

### System User Password Policy

- Added `super_administrator` as the default bootstrap and system-user role while keeping `administrator` as a lower admin role.
- Restricted the System Users create/edit UI and `/api/v1/admin/users` mutations to only `super_administrator` and `administrator`.
- Added `must_change_password` persistence for users and a protected `/api/v1/auth/change-password` endpoint.
- New admin-created system users are flagged to change their temporary password on first login before entering the administrator console.
- Queued a saved welcome email for newly created system users that includes the temporary password and admin sign-in link.

### Organizer Account Functions

- Added persisted organizer account support for profile settings, notification preferences, team members, and sponsor relationships.
- Added backend endpoints for organizer profile read/update, team create/update, and sponsor invite/update, with role checks and audit logs for mutations.
- Added PostgreSQL migration `016_organizer_account.sql` and memory-store defaults so local/demo organizer data is dynamic instead of frontend-only.
- Wired organizer Settings, Team, Add/Edit Team Member, Invite Sponsor, and Edit Sponsor pages to the Go API and replaced fake success behavior with real API calls.
- Added backend E2E-style tests covering organizer profile, team member creation, sponsor invite, and audit log creation.
- Replaced empty organizer Visitors and Feedback backend responses with lead-derived dynamic data for owned expos.
- Updated organizer Visitors and Exhibitors tables with date columns and added a clean empty state to organizer Feedback.
- Expanded the organizer dashboard backend summary with exhibitor count, visitor lead count, and recent activity derived from owned expos, payments, and leads.
- Aligned organizer and exhibitor payment receipt pages with the backend receipt contract (`issuedAt`, `organizerShare`, `platformShare`) and removed mismatched `generatedAt`/`netAmount` usage.
- Replaced organizer report placeholder cards with real chart rendering for settlement revenue, engagement, and visitor distribution, and removed the fake Excel export label.
- Routed organizer Settings security action to the real change-password page instead of showing unused password fields.

### Exhibitor Product And Engagement Functions

- Added persisted exhibitor product catalog support in memory mode and PostgreSQL mode, including migration `017_exhibitor_products.sql`.
- Added exhibitor product APIs for list, detail, create, and update with role checks, validation, and audit logs.
- Added optional expo scoping to product listing so expo detail pages only show products for that workspace.
- Wired exhibitor Add Product and Edit Product pages to the Go API and active category list instead of hardcoded form data.
- Removed fake product table actions and routed Edit Product to the real product edit page.
- Replaced empty exhibitor expo Visitors and Analytics responses with lead-derived dynamic data.
- Added backend tests covering exhibitor product create/update, expo visitors, expo analytics, and product audit logging.

### Full Stack Smoke Testing

- Ran backend tests, frontend production build, live API smoke tests, and in-app browser smoke tests across administrator, organizer, exhibitor, sponsor, and visitor sessions.
- Fixed profile sign-out so it clears the HttpOnly session cookie through `/api/auth/logout` before clearing local session state.
- Confirmed authentication, registration email-verification contract, forgot password, reset password, admin pages, organizer pages, exhibitor pages, sponsor pages, and visitor pages load against the Go API in local memory mode.

### Organizer Frontend Completion

- Added organizer expo detail and edit pages so the expo lifecycle is no longer limited to list/create screens.
- Wired organizer expo list actions to real API flows for view, edit, and submit-for-review, with Sonner success/error messages and cache refreshes.
- Added client-side validation to organizer expo create/edit forms for title, country, currency, timezone, location, and date order before calling the backend.
- Removed the unused organizer settings two-factor action and kept security tied to the real change-password flow.
- Fixed organizer page loading/error order so failed API calls show retryable error states instead of hanging on spinners.
- Removed fake delayed print state from settlement detail receipts and kept print behavior as a native browser action.
- Prevented owner team-member edits from opening a blocked edit flow; owner account details are managed from organizer settings.
- Verified the organizer route tree has concrete frontend pages for dashboard, expos, exhibitors, visitors, feedback, team, sponsors, payments, settlements, reports, and settings.

### Mobile Navigation UX

- Added a shared safe-area-aware mobile bottom navigation for administrator, organizer, exhibitor, sponsor, and visitor shells.
- Kept the active mobile route visible even when it is outside the first primary navigation items.
- Added a compact `More` action that opens the full mobile sidebar instead of crowding every menu item into the bottom bar.
- Added bottom content padding on mobile shell pages so tables, buttons, and forms do not disappear behind the bottom navigation.

### Exhibitor Account Completion

- Changed exhibitor expo access from open browsing to assigned/invited expos only.
- Added administrator and organizer exhibitor-assignment APIs with workspace number, workspace label, assignment status, authorization checks, validation, and audit logging.
- Changed digital workspace activation payment to require an existing non-disabled exhibitor assignment and to activate only that expo workspace.
- Added exhibitor profile persistence and a backend-backed settings save flow.
- Extended leads into a CRM model with status, temperature, next follow-up date, last contacted date, follow-up notes, interested product IDs, and activity history.
- Added lead update and follow-up activity APIs, plus audit logs for lead changes, calls, emails, WhatsApp actions, meetings, notes, and pre-order intent.
- Reworked the exhibitor dashboard around new leads, hot leads, overdue follow-ups, active expo workspaces, and incomplete setup.
- Rebuilt the assigned expo activation page to use backend fee, currency, workspace assignment, payment initialization, and payment confirmation.
- Upgraded the activated expo workspace with backend QR loading, lead CRM filters/actions, dynamic products, visitor/analytics data, payments, and receipts.
- Removed the fake exhibitor ad creation flow; workspace boosts remain a read-only future state until paid promotion workflow is implemented.
- Added accessible labels to shared table row action buttons after browser testing the exhibitor lead CRM menu.
- Documented the completed exhibitor account journey in `docs/EXHIBITOR_ACCOUNT.md`.

### Exhibitor Growth And Media Upload

- Added authenticated media upload with local file serving for exhibitor logos, product media, and workspace boost banners.
- Added exhibitor lead CSV export and a downloadable workspace QR SVG endpoint.
- Added saved CRM message queueing for email, SMS, and WhatsApp follow-up actions, backed by notification records and lead activity history.
- Added exhibitor workspace boost creation using the existing ad inventory model; boosts now list dynamically in the expo workspace.
- Wired exhibitor product create/edit, profile settings, QR, lead CRM, and boost UI to the new backend functions.

### Visitor Remote Expo Workspace

- Extended visitor expo detail responses with active exhibitor workspaces and expo-scoped product catalogs.
- Added `/api/v1/visitor/expos/{id}/actions` so visitor interest, meeting requests, and pre-order intent create exhibitor-visible leads without using an exhibitor-named frontend route.
- Rebuilt the visitor expo detail page around remote workspace access, product browsing, and lead-generating actions.
- Removed fake visitor favorite behavior from expo discovery and made filter categories derive from backend expo data.
- Added backend coverage for visitor workspace exhibitor workspaces/products and the visitor action endpoint.

### Sponsor Payment And Ad Activation

- Added sponsor ad payment initialization and confirmation endpoints.
- Changed sponsor ad payment UI from fake card processing to real backend payment calls.
- Paid sponsor ads now move from `pending_payment` to `draft`, which represents admin review before activation.
- Added public active-ad tracking for impressions and clicks.
- Extended backend tests across sponsor campaign creation, ad payment, admin activation, and tracking.

### Production Readiness Hardening

- Added production-aware Paystack checkout initialization for exhibitor activation and sponsor ad payments.
- Added signed Paystack webhook verification through `X-Paystack-Signature`.
- Made manual payment confirmation unavailable in provider mode so production payments are confirmed by webhook only.
- Extended the Paystack webhook to confirm both exhibitor activation payments and sponsor ad payments.
- Fixed administrator/provider confirmation of sponsor payments in PostgreSQL mode.
- Added a MinIO/S3-compatible media storage layer with local fallback, backend media proxying, and upload audit metadata.
- Added local MinIO compose setup and media storage documentation.
- Added lightweight rate limiting for sensitive auth, media upload, payment webhook, and ad tracking endpoints.
- Added an optional background notification worker controlled by `NOTIFICATION_WORKER_ENABLED`.
- Added payment reconciliation status updates for failed, cancelled, and refunded payments.
- Added Paystack failed/refunded webhook handling and backend tests for refund audit logging.
- Added PostgreSQL backup and restore scripts.
- Added an automated backup runner with interval and retention controls.
- Added external error alert webhooks for production 5xx monitoring.
- Expanded `/ready` with environment, storage, payment, queue, alert, and rate-limit metadata.
- Added a production-local smoke test script covering readiness metadata, admin proxy login, country-scoped admin endpoints, role dashboards, visitor email verification, media upload, and reports.
- Made the local dev runner and status script storage-aware, including MinIO/S3 readiness checks when the S3 driver is selected.
- Replaced the deployment guide with production environment, webhook, backup, health-check, and launch checklist guidance.
- Documented remaining production readiness work in `docs/PRODUCTION_READINESS.md`.

### Forgot Password Notification Fix

- Fixed PostgreSQL forgot-password lookup for encrypted PII deployments by matching users through `email_hash` as well as legacy plaintext email.
- Verified the demo deployment creates and sends a saved `password_reset` notification after submitting forgot password for an existing account.
- Changed the forgot-password API response to a generic message so reset tokens are only delivered through the email reset link.

### Registration Welcome Emails

- Registration for public visitor and sponsor accounts now sends the verification email first.
- After successful email verification, Tandaza sends two additional SMTP-backed emails: a product welcome email and a founder welcome note from Evans Mburu.
- Added backend tests to confirm welcome emails are not queued before verification and both welcome messages are queued after verification.
- Improved SMTP email deliverability by sending multipart text and HTML messages with standard Date, Message-ID, Reply-To, and sanitized headers.
- Expanded the founder welcome note with more mission, audience value, and a personal closing from Evans Mburu.

### Sponsor Plan Country Pricing

- Sponsor plan creation now uses the selected country default currency automatically instead of manual currency entry.
- Renamed sponsor plan form pricing to "Price" so admins enter the actual displayed amount.
- Added a backend guardrail so sponsor plan currency is derived from the active country record even if a mismatched currency is submitted.
- Sponsor plan creation now refreshes its country and currency fields immediately when the admin country switcher changes.
- Sponsor plan list actions now hide activate/deactivate based on current status and no longer shows the features-count column.
- Sponsor plan status changes now preserve existing price and organizer commission values.
- Sponsor plan price and commission inputs now use string-backed form state so admins can type full numbers without the field resetting mid-entry.

### Sponsor Account Onboarding Emails

- Admin-created sponsor accounts now use the dedicated sponsor creation endpoint instead of the global system-user endpoint.
- New sponsors receive three SMTP-backed emails: login credentials with the temporary password, a Tandaza sponsor welcome email, and a founder note from Evans Mburu.
- Added backend coverage to confirm sponsor onboarding emails are queued when an admin creates a sponsor account.

### Organizer And Exhibitor Onboarding Emails

- Admin-created organizer accounts now use the dedicated organizer creation endpoint and receive login credentials, a Tandaza organizer welcome email, and a founder note from Evans Mburu.
- Admin-created exhibitor accounts now use the dedicated exhibitor creation endpoint and receive login credentials, a Tandaza exhibitor welcome email, and a founder note from Evans Mburu.
- Added backend coverage to confirm organizer and exhibitor onboarding emails are queued when admins create those accounts.
- The admin expo creation form now defaults to the selected country and uses a real organizer dropdown instead of a manual Organizer ID text input.

### Admin Account UI/UX Refresh

- Refreshed the admin shell using the frontend UI/UX guide: layered token-based background, centered content width, translucent surfaces, and stronger workspace hierarchy.
- Polished the admin sidebar, topbar, mobile bottom navigation, page headers, stat cards, tables, and dashboard support cards without changing routes, API contracts, or permissions.
- Simplified administrator overview copy and card labels so the console feels more production-focused and less noisy.
- Verified the frontend production build after the UI refresh.

### Admin Dashboard UI/UX Polish

- Rebuilt the administrator overview into a command-style dashboard with a stronger hero, selected-country context, service-health summary, and direct operational shortcuts.
- Reworked the admin control and quick-action sections into clearer task cards with stronger visual hierarchy and more useful CTA placement.
- Added graceful empty states for recent activity, system health, and account distribution widgets.
- Verified the frontend production build after the dashboard polish.
- Refined the dashboard again to reduce the generic card-grid feel: added a stronger market command panel, sharper hero typography, more distinctive KPI treatments, and cleaner action emphasis.

### Expo Organizer PII Display Fix

- Fixed PostgreSQL-backed expo responses so organizer names are hydrated from encrypted company/name cipher columns before being returned to the admin UI.
- Added a safe fallback label for protected PII placeholders so admin expo tables and details no longer display `pii:<hash>` values.
- Verified backend tests and the frontend production build after the fix.

### Admin Form Feedback Fix

- Added shared invalid-field toast handling to admin create/edit forms so required fields, pattern checks, and native validation failures surface through Sonner instead of appearing to do nothing.
- Added explicit error handling to admin expo creation so API failures show a toast instead of failing silently.
- Verified the frontend production build after the form feedback fix.

### Expo Media And Admin Detail View

- Added persisted expo cover image support in PostgreSQL and memory mode, backed by the existing media upload endpoint.
- Added admin expo cover upload controls on create and edit pages, and surfaced the cover image on admin, visitor, and exhibitor expo discovery responses.
- Added exhibitor company logo upload in profile settings, removed the company URL field from the UI, and connected exhibitor profile categories to the active platform category list.
- Added expo-specific admin API sections for exhibitors, visitors, and analytics.
- Added expo-specific admin payment filtering and a payments-made section in the expo detail view.
- Rebuilt the admin expo detail view into focused sections: expo details, exhibitors, visitors, payments made, analytics, and ads.
- Verified `go test ./...` and `npm run build`.

### Expo Lifecycle Worker

- Added a backend expo lifecycle worker that runs on API startup and then on a configurable interval.
- The worker keeps the existing expo lifecycle statuses and automatically moves ended `published` or `live` expos to `completed` once the expo end date is before the current day.
- Added memory and PostgreSQL store support for bulk auto-completion and audit logging via `expo_auto_completed`.
- Added `EXPO_LIFECYCLE_WORKER_ENABLED` and `EXPO_LIFECYCLE_INTERVAL_SECONDS` to backend environment examples.
- Verified `go test ./...`.

### Organizer Portal Workflow Polish

- Hid protected `pii:<hash>` placeholders from organizer-facing exhibitor tables using safe display fallbacks.
- Added an organizer exhibitor invite flow that creates a temporary-password exhibitor login, optionally assigns the exhibitor to an owned expo, sends credentials/welcome/founder emails, and records an audit log.
- Updated organizer expo draft creation so country, currency, and timezone come from the organizer profile country instead of manual country/currency inputs.
- Added admin email notifications when an organizer creates a new expo draft for review.
- Rebuilt organizer My Expos as image cards and redesigned organizer expo detail into tabs for overview, exhibitors, payments, analytics, and visitors.
- Updated organizer team-member creation to remove role selection, require a temporary password, create a login account, and force password change on first login for all temporary-password users.
- Reworked organizer sponsor invite/edit pages to remove plan tier, use commission rate, support temporary-password sponsor onboarding, and send credentials/welcome/founder emails.
- Verified `go test ./...` and `npm run build`.

### Admin Expo And Exhibitor Invite Cleanup

- Removed assigned-expo and assignment-status fields from the admin New Exhibitor form so exhibitor invitation stays account-focused.
- Kept expo activation payment as a self-service exhibitor action after assignment, instead of mixing manual payment capture into account creation.
- Added a saving guard to the shared admin form and the New Exhibitor page so repeated clicks cannot submit overlapping create requests.
- Rebuilt the admin Expos list from a table into image cards with search, status filtering, stat cards, and pagination.
- Verified `npm run build`.

### Exhibitor Activation Queue

- Updated the exhibitor Browse Expos endpoint so it returns only assigned expos that have not yet been activated or disabled.
- Added a frontend guard so the exhibitor Browse Expos page only renders assigned, non-active expo workspaces awaiting activation.
- Verified `go test ./...` and `npm run build`.

### Exhibitor Company Document Removal

- Added a protected `DELETE /api/v1/exhibitor/documents/{id}` endpoint for removing company documents from the exhibitor workspace.
- Implemented document deletion in memory and PostgreSQL stores with ownership checks.
- Added audit logging for `company_document_removed`.
- Added a Remove action in the exhibitor Settings > Company Documents table with toast feedback and automatic refresh.
- Verified `go test ./...` and `npm run build`.

### Organizer Exhibitor Invite Cleanup

- Removed the Assign Expo dropdown from the organizer Invite Exhibitor page.
- Simplified organizer exhibitor invite API behavior so the endpoint creates the exhibitor account and sends onboarding emails without assigning an expo.
- Kept expo assignment as a separate expo/workspace management action.
- Verified `go test ./...` and `npm run build`.

### Organizer Expo Detail Stability

- Fixed the organizer expo detail page so exhibitor, payment, and visitor tabs safely handle empty or partially hydrated API list responses.
- Updated the organizer analytics tab to read the current report response shape while retaining compatibility with older report payloads.
- Verified `npm run build`.

### Exhibitor Browse Expos Activation Flow

- Updated Browse Expos so exhibitors see all published/live expos they have not activated, instead of only assigned expos.
- Removed the My Workspaces tab from the Browse Expos page so the page stays focused on activation discovery.
- Updated activation payment creation so activating an available expo creates the exhibitor-expo relationship when one does not already exist.
- Verified `npm run build`; local Go tooling was unavailable on this machine, so backend compilation will be verified during server deployment.
- Cleaned up remaining exhibitor navigation and quick-action wording so activation discovery consistently uses Browse Expos language.

### Admin Expo Form Country Defaults

- Changed admin expo create/edit timezone fields from free text to a timezone dropdown.
- Made admin expo currency read-only so it stays derived from the selected country defaults.
- Shared timezone option generation with the Countries page.

### Exhibitor My Expos Visibility

- Restored `My Expos` as a first-class exhibitor sidebar item next to Browse Expos.
- Added a dashboard action for My Expos so exhibitors can quickly open activated expo workspaces.
- Scoped My Expos to activated workspaces only, while Browse Expos remains for unactivated expo discovery.

### Exhibitor Activation Page Polish

- Reworked the exhibitor expo activation detail page into a minimal two-column layout with expo context, cover image, fee, and one focused activation CTA.
- Reduced duplicate activation cards and kept the page centered on the one-off workspace activation decision.
- Added admin-configurable expo ads add-on pricing and an optional exhibitor activation checkbox that adds the add-on amount to the activation payment.
- Gated exhibitor workspace ad creation behind the paid ads add-on so exhibitors can create ads for an expo only when they selected and paid the add-on during activation.
- Scoped exhibitor workspace ads to the current expo and added `expo_id` persistence for ad records so expo detail pages, exhibitor workspaces, and admin views do not mix ads across expos.
- Integrated exhibitor activation with Paystack redirect checkout using database-managed Paystack settings from admin configuration.
- Restricted Paystack checkout channels to card by default for activation payments.
- Added `/payments/callback` verification so returning exhibitors are verified server-side through Paystack before the workspace is activated.
- Added exhibitor receipt email and organizer commission email after a successful activation payment, with notification records and provider attempts persisted through the existing notification system.

### Google Visitor Authentication

- Added database-backed Google sign-in settings under global admin settings.
- Added Google sign-in and sign-up buttons for visitor authentication.
- Removed sponsor self-registration from the public registration flow; sponsor accounts remain invitation/admin managed.

### Paystack Processing Fee

- Added database-backed Paystack processing-fee configuration as a percentage in Global Settings.
- Added payment-level processing fee persistence so checkout totals can include provider processing costs without reducing the configured activation value.
- Kept organizer commission calculations based on the activation value before processing fees, while Paystack receives the gross checkout amount.
- Added the processing fee to exhibitor activation pricing responses and payment records.

### Activation Payment Failure Fix

- Added the missing PostgreSQL payment amount column used when a successful activation payment marks an exhibitor workspace active.
- Tightened admin expo pricing validation so activation and ads add-on fees must be whole money values, avoiding fractional totals such as `19.98`.
- Added a data migration to round existing expo activation/add-on prices to whole amounts and correct pending fractional activation payments.

### Exhibitor Product Management Upgrade

- Rebuilt the exhibitor add/edit product flow with company-category selection, rich description/specification editors, demo video URL support, PDF presentation upload, and up to five product images through the media upload API.
- Added an explicit product currency field with 3-letter currency-code validation.
- Added PostgreSQL and memory-store persistence for product image galleries, demo video links, and presentation materials.
- Added protected product deletion with exhibitor ownership checks and audit logging.
- Reworked product detail into tabs for overview, images, materials, and editing, with list actions for view, edit, and delete.
- Improved product detail media rendering so images fit cleanly in preview frames and demo videos render inline with video/embed players.
- Simplified the exhibitor product list actions to view-only and removed raw expo identifiers from product detail summaries.
- Added original price to the exhibitor product detail summary beside the current price.

### AI-Powered Analytics

- Added global OpenAI settings under administrator Global Settings with enablement, model, API key, and provider test support.
- Added cached AI analytics summaries for admin country reports, organizer reports, exhibitor expo workspaces, and sponsor reports.
- Added role-scoped AI summary endpoints that generate recommendations from aggregated metrics only, avoiding raw PII in OpenAI prompts.
- Added AI Performance Summary cards across admin, organizer, exhibitor, and sponsor analytics screens with generate/refresh actions and persisted fallback summaries when OpenAI is not configured.

### Exhibitor Meeting Calendar

- Replaced the exhibitor expo workspace meetings table with a week/day calendar view and an action-first new meeting dialog.
- Added persisted meeting creation/listing APIs for exhibitor expo workspaces, backed by PostgreSQL and memory mode.
- Visitor meeting requests now create saved meeting records when a meeting time is provided.
- Meeting creation queues saved confirmation emails and 30-minute reminder notifications for the exhibitor and visitor through the existing notification system.
- Expanded Google admin settings to include calendar integration fields needed for Google Meet-backed scheduling.
- Added global meeting category settings with default categories, public category fetching, and a clearer exhibitor scheduling dialog for selecting an existing lead or entering a new visitor with country code, meeting title, category, Google Meet/location, and rich internal notes.
- Added CC email invites to exhibitor meeting scheduling. Additional invitees are validated, persisted, added to Google Calendar attendees, and receive scheduled meeting plus reminder emails.
- Added exhibitor-owned meeting categories in Company Settings, with PostgreSQL persistence, memory-mode support, audit logs, and expo meeting forms now fetching the company-specific list instead of only global defaults.
- Simplified meeting calendar cards to show title, date, and time only; clicking a meeting now opens a details dialog with visitor information, meeting link, Join Meeting, and a real persisted Delete action.
- Meeting creation now emails every active user on the exhibitor team, the visitor, and all CC invitees for both immediate scheduled confirmations and queued reminders.
- Meeting reminders now queue 30-minute, 5-minute, and 1-minute reminders. Platform users receive email, in-app/browser, and push notification records; CC-only invitees receive email reminders.
- Meeting SMTP dispatch now honors the admin-configured SMTP encryption mode and sends to the exact notification payload recipient before falling back to a joined user email.
- Added authenticated in-app notification fetching, read-all, mark-read, and clear actions with persisted read/dismiss state for account topbar notifications.
- Updated exhibitor workspace meeting cards so long meeting titles wrap at a smaller font size instead of truncating in the calendar view.
- Updated visitor meeting notification subjects to include the exhibitor company name and expo name.
- Fixed CC meeting invite emails so external CC recipients are saved without a fake user id and can be delivered through SMTP.
- Fixed meeting reminders so future queued reminders are hidden from account notification dropdowns until due, with 30-minute, 5-minute, and 1-minute reminders each sending email plus one in-app/browser top-nav notification for platform users.
- Meeting deletion now cancels queued reminders and sends cancellation emails to the visitor and all CC invitees.
- Meeting scheduled, reminder, and cancellation email copy now formats meeting times in the expo's configured timezone instead of the server/timestamp timezone.
- Account notification dropdowns now show only user-facing in-app notifications, preventing email and push delivery records from appearing as duplicate top-nav notifications for the same meeting event.
- Exhibitor expo workspaces now receive the expo timezone from the backend, convert meeting form input from that expo-local time into UTC before saving, and render meeting calendar days, cards, and detail dialogs in the expo timezone.
- Exhibitor workspace meeting totals now use persisted meeting records, so the overview card, meetings menu badge, analytics payload, and calendar count stay aligned.
- Exhibitor overview and workspace menu badge now count only upcoming scheduled meetings, while backend analytics also exposes total, upcoming, completed, and cancelled meeting counts.
- Expanded the exhibitor pre-orders tab with search/status filters, CSV and Excel exports, persisted status updates, customer contact columns, and purchase order PDF downloads.
- Reworked the exhibitor expo products tab into an expo showcase workflow where exhibitors choose existing company products for a specific expo, remove products from that showcase, view product details, and see visitor-facing original/discount pricing.
- Added passive exhibitor-profile visit capture for visitors who open an expo workspace through QR/remote access, stored as lead activity so it persists in PostgreSQL.
- Expanded the exhibitor workspace Visitors tab with search, visit-source filters, phone number, engagement count, and last-seen columns based on aggregated visitor lead/activity records.
- Simplified the exhibitor Leads tab with polished status/temperature dropdown filters, CSV and Excel exports for the filtered lead view, direct hot/warm/cold temperature badges, and focused lead state actions only.
- Added exhibitor-owned manual lead creation from the expo workspace, supporting existing visitor selection, new visitor capture, lead status, temperature, notes, arrange-meeting, pre-order, and scheduled-call intents.
- Disabled public visitor self-registration on the backend while keeping the frontend registration form and Google sign-up button visible in a disabled state. Google authentication now only signs in existing users instead of auto-creating new visitor accounts.
- Updated exhibitor lead temperature badges so hot, warm, and cold use distinct colors instead of generic status styling.
- Reworked exhibitor workspace Conversations into real visitor/exhibitor chat, backed by dedicated chat thread/message tables instead of lead activity. Visitors can start a chat from an exhibitor profile, exhibitors can reply from the workspace Conversations menu, and WebSocket subscriptions refresh active threads in realtime.
- Added persisted exhibitor live-stream settings per expo workspace, backed by PostgreSQL and memory mode, with YouTube URL validation, embed URL generation, audit logging, and a workspace UI for enabling a stream for remote visitors.
- Added exhibitor ROI capture to the activation flow with one optional estimated investment amount, persisted on the expo workspace and converted into ROI analytics after activation.
- Added exhibitor ROI endpoints for loading and updating an expo workspace estimate, with PostgreSQL/memory support, audit logging, and analytics derived from investment, Tandaza spend, leads, meetings, pre-orders, hot leads, and won leads.
- Added an ROI performance section to exhibitor expo analytics with total investment, estimated return, ROI signal, cost per lead, spend breakdown, and recommended actions.
- Expanded exhibitor ROI analytics with investment recovery, net return, revenue multiple, cost per meeting/pre-order, break-even guidance, average lead/pre-order value, and pipeline value by lead temperature/status.
- Updated exhibitor activation checkout so the activation button shows an inline loading spinner while Paystack opens and exhibitors can choose Paystack channels, with card selected by default.

### Exhibitor ROI Semantics Refresh

- Kept ROI scoped to exhibitor workspaces only, per expo, and aligned the analytics language around exhibitor investment versus leads, meetings, pre-orders, and pre-order value.
- Split exhibitor ROI analytics into realized return from tracked pre-orders and projected return from pipeline signals, instead of presenting one blended ROI number without context.
- Added separate projected pipeline, realized ROI, projected ROI, realized/projected recovery percentages, and realized/projected return multiples to the exhibitor expo analytics response.
- Refined pipeline projection so lead temperature, follow-up stage, meeting activity, scheduled follow-up presence, and pre-order intent influence projected value more transparently.
- Added an explicit ROI calculation-method explanation and base lead value to the exhibitor workspace analytics UI so projected ROI is easier to interpret.
- Updated exhibitor ROI API/frontend contracts and documentation to describe exhibitor-only, expo-specific ROI inputs and analytics more clearly.

### Exhibitor Workspace Ad Upload UX

- Removed the budget amount field from the exhibitor expo workspace ad form so ad submission stays focused on the required banner creative.
- Kept exhibitor workspace ads locked to one fixed banner format and surfaced the requirement directly in the dialog with a dedicated preview slot.
- Added clearer upload guidance in the exhibitor ads section for the required 728 x 90 px PNG/JPG banner and 2 MB maximum file size.

### Deployment Runbook

- Added `docs/DEPLOYMENT_RUNBOOK.md` with the demo server bare-repo deployment flow, targeted file push workflow, verification commands, Nginx/SSL notes, rollback commands, and deployment safety rules.
- Added `scripts/deploy-demo.sh` as a single frontend/backend demo deployment command with local checks, server temp clone, safe excludes, commit/push, and post-deploy health verification.
- Updated the demo deploy script to mark the server temporary clone as a Git safe directory before inspecting, committing, or pushing changes.

### Exhibitor Workspace Conversations Polish

- Removed last-message previews from the exhibitor workspace Conversations thread list so visitor identity and recency stay focused and compact.

### Organizer Payout Details

- Added persisted organizer payout payment method fields for bank transfer, mobile money, and manual settlement instructions.
- Added a Payout Payment Method tab to organizer settings so organizers can save payout details used by finance.
- Updated organizer settlement invoice details to display the saved payout method and account information instead of empty bank placeholders.

### Organizer Finance PDF Polish

- Reworked organizer payment receipts into a premium print/PDF layout with a branded header, clear payer/payee blocks, itemized activation/add-on/fee breakdown, and finance footer details.
- Reworked organizer settlement invoices into a matching professional PDF layout with net payout emphasis, payout method details, itemized settlement breakdown, and print-safe styles.

### Exhibitor To Organizer Feedback

- Added persisted exhibitor-to-organizer expo feedback with ratings, categories, improvements, dislikes, and audit logging.
- Added an exhibitor workspace feedback form so exhibitors can send practical feedback to the organizer for that expo.
- Updated the organizer Feedback page to show exhibitor feedback alongside visitor-derived feedback.

### Organizer Sponsor Invite Disabled

- Removed the organizer Sponsors page invite action and replaced the direct invite route with a disabled-state page.
- Disabled the organizer sponsor invite API so sponsor onboarding is controlled from the administrator workspace.

### Organizer Settlement Payout Correction

- Corrected settlement payout semantics so the organizer settlement amount is the organizer commission earned from paid expo payments, not gross revenue minus commission.
- Updated organizer and administrator settlement labels to show gross revenue, organizer commission, platform retained amount, and payout due clearly.

### Organizer Team Login Access

- Changed organizer team-member creation into a real organizer login-user flow with temporary password, first-login password reset, welcome email, and founder note.
- Scoped organizer team users to their main organizer company workspace so they can access the same expos, payments, visitors, feedback, reports, and profile data.
- Made team creation and deletion main-organizer-only, disabled team editing, removed permissions UI, and added delete member actions in the organizer team list.

### Organizer Feedback Cleanup

- Removed visitor-lead-derived placeholder feedback from the organizer feedback API so the page only shows feedback explicitly submitted by exhibitors.
- Rebuilt organizer feedback as a paginated data table with exhibitor, expo, rating, category, comments, improvements, dislikes, and submitted date columns.

### Organizer Visitor Expo Drilldown

- Added visited-expo details to organizer visitor records so each visitor includes the exact expos they engaged with, interaction counts, and last activity per expo.
- Updated the organizer Visitors table so the expo count opens a dialog listing the visitor's visited expos instead of being a static number.

### Organizer Exhibitor Assignment List

- Updated organizer exhibitor records to return one row per exhibitor assigned to the organizer's expos, with assigned expo names grouped into the table.
- Adjusted the organizer Exhibitors page copy and assigned-expos column so it reflects expo participation, not all platform exhibitors.

### Organizer Expo Detail Upgrade

- Reworked the organizer expo detail view into a richer operations workspace with activation, visitor, revenue, commission, feedback, and timeline signals.
- Added expo-specific filtering for exhibitors, visitors, payments, and feedback so every tab shows data tied to the viewed expo.
- Added lightweight progress visuals and analytics cards using current backend data rather than placeholder metrics.

### Organizer Reports Expansion

- Expanded organizer reports with aggregated expo lifecycle, exhibitor activation, lead status, lead temperature, payment status, and settlement breakdown series.
- Added organizer reports UI sections for overview, exhibitors, leads, settlements, engagement, and visitors using current backend data.
- Included organizer commission, platform retained value, and pending settlement signals in the reporting response.

### Organizer Expo Performance Rankings

- Added daily expo performance scoring from visitor leads and paid activation payments.
- Added best-expo ranking data using revenue, commission, leads, unique visitors, assigned exhibitors, and active exhibitor workspaces.
- Updated organizer reports to show a best expo card, per-day performance chart, and expo ranking table.

### Platform Button System

- Standardized the shared platform button primitive with primary, secondary, outline, ghost, soft, danger, and icon treatments.
- Added a reusable `buttonClasses` helper so button-styled links use the same sizing, focus, hover, disabled, and spacing rules as real buttons.
- Moved shared admin resource pages, form footers, back links, table row action triggers, and pagination controls onto the shared button system.
- Documented the platform button inventory and usage rules in the frontend UI reference.

### Organizer Feedback Detail Action

- Added a table row action on the organizer Feedback page so organizers can open full exhibitor feedback comments, improvements, dislikes, rating, expo, and submission date in a focused dialog.

### Organizer Reports Visual Upgrade

- Reworked organizer Reports & Analytics with a stronger performance cockpit, priority health signals, richer metric cards, and varied chart colors across report sections.
- Added a data-backed AI performance summary fallback that uses the currently loaded organizer report metrics without mentioning provider configuration.
- Improved report chart presentation so lifecycle, exhibitor, payment, settlement, lead, visitor, and daily expo performance sections feel more distinct and readable.

### Organizer Expo Detail Analytics Workspace

- Upgraded the organizer expo detail tabs with searchable, filterable, exportable, paginated data tables for exhibitors, visitors, payments, and feedback.
- Added daily expo aggregation using payments, visitor activity, interactions, and feedback submitted during the expo date range.
- Added best-performing exhibitor scoring based on activation status and paid payment activity, with visual ranking panels in overview and analytics.
- Reworked overview and analytics sections to feel more like a premium operations workspace with stronger cards, progress signals, and data hierarchy.

### Admin Reports Platform Aggregation Upgrade

- Reworked administrator Reports & Analytics into a platform-wide performance view with executive pulse, country scope, expo supply, captured leads, notifications, operations mix, and platform health sections.
- Added CSV export for admin report metrics, revenue series, and activity series.
- Added a data-backed AI performance summary fallback using aggregated admin report data without exposing provider or configuration wording.
- Improved admin report charts with richer framing and varied chart colors for clearer platform-level comparison.

### Platform Button Gradient Polish

- Added subtle gradients to the shared platform button variants so primary, secondary, outline, ghost, soft, and danger buttons feel more premium while keeping the existing sizing and behavior.

### Visitor-Only Public Registration

- Re-enabled public visitor registration with email verification while keeping sponsor self-registration hidden from the public UI.
- Tightened the Next.js auth proxy and Go backend registration path so only visitors can self-register; sponsors remain admin-created accounts.
- Updated registration copy and metadata to be visitor-focused with no sponsor signup language.

### Visitor Analytics Data Capture

- Added a dedicated visitor activity capture endpoint for analytics events that should not create leads.
- Started capturing exhibitor profile views, product views, document opens/downloads, meeting joins, and saved favourites into the visitor timeline event store.
- Updated visitor activity UI labels so the new analytics events render cleanly in visitor activity surfaces.

### Reminder Notification Coverage

- Expanded meeting reminders to queue SMS alongside email, in-app system notifications, and push webhook records when recipients have the required contact details.
- Expanded lead follow-up reminders to queue in-app system notifications and push webhook records in addition to existing email/SMS reminders.
- Improved browser notification fan-out so multiple newly unread reminders can appear without waiting for each notification to become the latest item.

### Visitor Lead Notification Coverage

- Added professional new-lead notifications when a visitor shares interest or requests a meeting from an exhibitor profile.
- New lead alerts are sent to the exhibitor owner and active exhibitor team members by email, with matching in-app and push records for workspace notifications.
- Added backend coverage to confirm visitor interest queues new-lead notifications for all exhibitor admins.

### Exhibitor Contact Links

- Restored exhibitor website saving from company settings and preserved it in memory mode.
- Added website and social links to visitor-facing exhibitor company details when exhibitors have provided them.
- Extended visitor booth API contracts so frontend pages receive exhibitor website and social link data from the backend.
