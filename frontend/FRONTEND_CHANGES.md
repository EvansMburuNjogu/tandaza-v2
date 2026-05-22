# Tandaza Frontend — UI/UX Reference

> Reference document for AI agents and developers continuing work on this codebase.
> Stack: **Next.js 15 App Router · React 19 · Tailwind CSS v3 · TypeScript**.
> All paths are relative to `frontend/`.

---

## Auth API Integration

- Replaced dummy login shortcuts with real authentication forms.
- Added frontend auth routes under `/api/auth/*` that proxy to the Go backend and store JWT sessions in an HttpOnly cookie.
- Added `/api/backend/[...path]` as the authenticated browser-to-Go proxy for private API calls.
- Added public pages for `/register`, `/forgot-password`, and `/reset-password`.
- Added `/verify-email` so new visitor/sponsor accounts activate through an emailed verification link before entering a workspace.
- Limited public self-registration to visitors and sponsors; organizer, exhibitor, and administrator accounts must be created through controlled platform workflows.
- Added confirm-password validation to registration and reset-password forms.
- Added Sonner as the single frontend alert and notification system.
- Added session hydration from `/api/auth/session` so refreshes use the HttpOnly cookie instead of localStorage.
- Removed the old dummy API driver and React Toastify provider so pages use the Go-backed HTTP contract.
- Removed visitor-facing non-expo admission language from the frontend; visitor flows now focus on expos, exhibitor access, favorites, schedule, and timeline activity.

---

## Design System

### Color tokens (`app/globals.css`, `tailwind.config.ts`)
All colors are CSS HSL variables consumed via Tailwind semantic aliases.
**Never use raw Tailwind color names (e.g. `blue-500`) for brand/status** — always use the token.

| Token | Light value | Purpose |
|---|---|---|
| `background` | `225 25% 97%` | Page background |
| `foreground` | `228 20% 14%` | Primary text |
| `card` | `0 0% 100%` | Card/panel surfaces |
| `elevated` | `224 38% 99%` | Slightly raised surface |
| `sidebar` | `230 24% 15%` | Sidebar background (dark always) |
| `primary` | `234 79% 61%` | Indigo brand accent |
| `accent` | `262 79% 64%` | Violet secondary accent |
| `border` | `226 19% 87%` | Default border |
| `success` | `148 63% 42%` | Emerald |
| `warning` | `39 92% 52%` | Amber |
| `danger` | `0 76% 58%` | Red |

Dark mode activates via `data-theme="dark"` on `<html>`. All tokens have dark counterparts.

### Typography
- Font: **Inter** with OpenType features `cv02, cv03, cv04, cv11` (set in `globals.css`)
- `text-rendering: optimizeLegibility` and `-webkit-font-smoothing: antialiased` are global
- Eyebrow / section labels: `text-[10px] font-bold uppercase tracking-[0.28em–0.32em] text-slate-500`
- Page titles: `text-2xl lg:text-[1.75rem] font-semibold tracking-tight`
- Table headers: `text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400`
- Body text: `text-sm`

### Shadows (`tailwind.config.ts`)
```
shadow-shell  → 0 30px 80px rgba(15,23,42,0.12)   large surfaces / modals
shadow-card   → 0 14px 36px rgba(15,23,42,0.08)   cards / buttons
shadow-float  → 0 22px 48px rgba(15,23,42,0.14)   dropdowns / tooltips
```

### Border radius
- Cards, buttons, inputs: `rounded-xl` (0.75rem)
- Smaller chips/badges: `rounded-full` or `rounded-lg`
- Large panels / modals: `rounded-2xl`
- Custom: `rounded-xl2` = 1.25rem, `rounded-xl3` = 1.75rem

### Transitions
- Interactive elements: `cubic-bezier(0.4, 0, 0.2, 1)` at `200ms` (global in `globals.css`)
- Sidebar width collapse: `transition-[width] duration-300 ease-in-out`
- Sidebar text/label hide: `transition-[width,opacity] duration-300` with `w-0 opacity-0`
- **Never use `max-w-0` to hide flex children** — use `w-0 overflow-hidden` (`max-width` fights `flex-1`)

---

## Layout Shell (`components/admin/app-shell.tsx`)

```
<AdminShell>
  <AdminSidebar />          fixed, left, z-50 on mobile / z-auto on desktop
  <main content>
    <AdminTopbar />         sticky top-0 z-30, h-[60px]
    <main>...</main>        flex-1 overflow-y-auto, px-4 sm:px-6 lg:px-8
  </main>
</AdminShell>
```

- Collapsed state persisted to `localStorage` key `tandaza-admin-sidebar-collapsed`
- `matchMedia("(min-width: 1024px)")` listener auto-closes mobile drawer on resize
- Content left padding transitions: `lg:pl-[72px]` (collapsed) / `lg:pl-[260px]` (expanded)

---

## Sidebar (`components/admin/sidebar.tsx`)

### Dimensions
| State | Width |
|---|---|
| Desktop expanded | `260px` |
| Desktop collapsed | `72px` |
| Mobile drawer | `260px`, slides with `translate-x` |

### Key rules
- **Mobile and desktop use separate transition properties** — mobile: `transition-transform`, desktop: `lg:transition-[width]`. Never share `transition-all`.
- Collapsed labels hide via `w-0 opacity-0` (not `max-w-0`)
- **Always add `lg:gap-0`** on the parent flex element when its label child is `w-0` — without it, phantom gap space remains
- Scrollbar hidden with `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` while keeping scroll functional
- Tooltip caret and label share **one opacity wrapper** (`opacity-0 group-hover:opacity-100`) — if they're separate, the caret renders as a permanent `<` shape

### Active item style
```
bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
```
Left accent bar: `absolute left-0 h-5 w-[3px] bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]`

---

## Topbar (`components/admin/topbar.tsx`)

- Fixed height `h-[60px]` — single row, never stacks
- **No page title/description in topbar** — those live in `<PageHeader>` inside page content
- Left: sidebar toggle → divider → breadcrumb (desktop) / page name (mobile)
- Right: Dummy API indicator · ThemeToggle · bell (with badge) · ProfileDropdown
- All icon buttons: `h-9 w-9 rounded-xl border border-border/70 bg-card/80 shadow-sm`

---

## Profile Dropdown (`components/admin/profile-dropdown.tsx`)

- Trigger: gradient-initials avatar + name + role on `sm+`, avatar-only on mobile
- Chevron rotates `rotate-180` when open
- Dropdown: `w-64 rounded-2xl backdrop-blur-xl`
- Menu no longer includes dead placeholder links; it only shows user identity + sign out
- Sign out: danger colour + sign-out icon + `hover:bg-danger/8`
- Closes on outside `mousedown` event

---

## Page Header (`components/admin/page-header.tsx`)

```tsx
<PageHeader
  title="Page Title"
  description="Subtitle text."
  actions={<Button>...</Button>}
/>
```

- Layout: `flex flex-col sm:flex-row sm:items-start sm:justify-between`
- Title: `text-2xl lg:text-[1.75rem] font-semibold tracking-tight`
- Actions align right on `sm+`

---

## StatCard (`components/admin/stat-card.tsx`)

- Animated `animate-ping` pulse dot (top-right corner)
- Trend arrow SVGs: ↑ up / ↓ down / — neutral
- "vs last period" context label in trend badge
- Hover gradient accent (top-right, `opacity-0 group-hover:opacity-100`)
- `hover:border-primary/20` on `Card` wrapper

---

## Card (`components/ui/card.tsx`)

```tsx
<div className="rounded-2xl border border-border/80 bg-card shadow-card" />
```

**No `hover:shadow-float` on the base Card** — it was firing on every surface including tables. Add hover effects explicitly at the usage site.

---

## ResourcePage (`components/admin/resource-page.tsx`)

Standard template for all 9 admin list pages. Renders: `PageHeader → stat cards → toolbar → DataTable`.

### Toolbar
```
[search input + SearchIcon + clear ×]   [status select ⬤dot-when-filtered]  [N records pill]
```

- **Clear (×) button** appears inside the search input whenever `query !== ""`
- **Active-filter dot**: a small `bg-primary` dot badge on the status select when status ≠ `"all"`
- Status select: `appearance-none` + custom chevron overlay
- Record count: `tabular-nums` pill with `text-xs` label

### Action buttons
`actionLabel` auto-detects intent:
- Starts with `add/create/invite/new` → `<PlusIcon>` + primary button
- Otherwise → `<DownloadIcon>` + primary button
- Export CSV is always a separate secondary button
- Use `actionHref` for real create/view/edit navigation
- Use `actionOnClick` only for real button actions, never dead placeholders

### Stat card grid
```
2 stats → sm:grid-cols-2
3 stats → sm:grid-cols-2 xl:grid-cols-3
4+ stats → sm:grid-cols-2 xl:grid-cols-4
```

---

## DataTable (`components/admin/data-table.tsx`)

### Header
- `bg-elevated/80 border-b border-border/70 py-3`
- Text: `text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400`
- Sort icons: `h-3 w-3` (smaller = less noisy); active column shows primary-coloured caret
- `aria-sort` attribute on each `<th>` for accessibility

### Body
- `divide-y divide-border/40` on `<tbody>`
- Odd rows: `bg-elevated/30` (light zebra), even rows: transparent
- Hover: `hover:bg-primary/[0.035]` (very subtle indigo wash)
- All cells: `align-middle px-5 py-3.5`

### Row actions dropdown
- **React state managed** — only one dropdown can be open at a time; outside click closes it
- Dropdown is portal-mounted to `document.body` so it cannot be clipped by `overflow-x-auto`
- Trigger: `h-8 w-8 rounded-lg border`; shows primary tint when open
- Dropdown: `min-w-44 rounded-2xl border bg-card/98 shadow-float backdrop-blur-xl`
- Danger items: `text-danger hover:bg-danger/8`

### Action behaviour
- `router.push(...)` for view / edit / create flows
- `useConfirm()` for approve / suspend / archive / retry / deactivate / flag flows
- `toast.*()` for all feedback after action completion

### Pagination
- Left: "X–Y of N results" + Per-page select (5 / 8 / 10 / 20 / 50)
- Right: `← Prev` | `currentPage / totalPages` | `Next →`
- Page changes on `rows.length` or `pageSize` change via `useEffect`

### Empty state
- `h-14 w-14 rounded-2xl border bg-elevated` icon box
- Inline SVG table icon + title (`font-semibold`) + description (`text-xs text-slate-400`)

---

## Shared Cell Renderers (`components/admin/cells.tsx`)

| Export | Props | Use |
|---|---|---|
| `AvatarCell` | `name, sub?, color?` | Person/company with coloured initial avatar |
| `EntityCell` | `primary, sub?` | Reference/title + subtitle, no avatar |
| `NumericCell` | `value, suffix?` | `tabular-nums` integer/count |
| `CurrencyCell` | `value` | `font-mono tabular-nums` for amounts |
| `DateCell` | `value` | Splits date and time onto two lines |
| `PillBadge` | `value, tone?` | Uppercase pill: neutral/primary/success/warning/danger/info |
| `RoleBadge` | `role` | Fixed colour per role name |

**Avatar colour** is auto-derived from `charCodeAt` of name — no prop needed unless overriding.

**`RoleBadge` colour map:**
```
administrator → violet
organizer     → blue
exhibitor     → emerald
sponsor       → amber
visitor       → sky
support       → rose
```

---

## StatusBadge (`components/admin/status-badge.tsx`)

Tone derived from status string via `includes()` checks:
- `healthy/active/verified/approved/delivered/live` → emerald
- `pending/queued/warning/upcoming` → amber
- `suspended/failed/degraded/archived/inactive` → red
- `draft` → slate
- `disbursed` → sky

---

## ErrorState (`components/ui/error-state.tsx`)

```tsx
<ErrorState
  title="Something went wrong"       // optional, has default
  message="Description…"             // optional, has default
  onRetry={() => query.refetch()}    // optional — shows retry button when provided
/>
```

Used on every page when `query.isError`. Shows a red icon box, title, description, and a "Try again" button that calls `onRetry`.

**Standard pattern for all pages:**
```tsx
if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
```

---

## Spinner (`components/ui/spinner.tsx`)

```tsx
<Spinner className="h-8 w-8 text-primary" />
```

SVG `animate-spin`. Track ring at `opacity-20`, arc at `opacity-80`.

**Standard usage:**
- Full-page loading: `<Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />`
- Inline button loading: `<Spinner className="h-4 w-4" />`

---

## Page Loading (`app/administrator/loading.tsx`)

Next.js App Router `loading.tsx` — fires during route-level navigation via Suspense.
Skeleton mirrors the dashboard layout: stat cards + activity timeline + side cards.
Uses `animate-pulse` with staggered `animationDelay`.

---

## Login Page (`app/login/page.tsx` + `components/auth/login-form.tsx`)

### Layout
```
<div className="flex w-full min-h-screen">
  left panel (hidden lg:flex, lg:w-[480px] xl:w-[520px], dark bg-slate-950)
  right panel (flex-1, all screen sizes)
</div>
```

### Left panel
- Background: `bg-slate-950` + dual radial indigo/violet gradients
- Decorative grid at 48px intervals with radial gradient mask
- "Platform live" pill with `animate-pulse` dot
- Three feature rows with icon box + title + description

### Right panel — form flow
1. **"Continue with Google"** button — inline Google `G` SVG, mock in demo mode (shows error banner)
2. **"or" divider** (horizontal rules with text)
3. Email input with envelope icon prefix
4. Password input with lock icon prefix
5. Error banner (red, with alert icon) — shown for both API errors and Google demo notice
6. Submit button: `<Spinner>` + "Signing in…" during loading, arrow icon at rest
7. **Demo accounts** section with helper hint text, coloured initial per role, checkmark on selected

### Demo accounts
```
Administrator → violet  → admin@tandaza.demo / admin123
Organizer     → blue    → organizer@tandaza.demo / organizer123
Exhibitor     → emerald → exhibitor@tandaza.demo / exhibitor123
Sponsor       → amber   → sponsorship@tandaza.demo / sponsorship123
Visitor       → rose    → visitor@tandaza.demo / visitor123
```

---

## Overview Dashboard (`app/administrator/page.tsx`)

- **Quick Actions cards**: icon box (`bg-primary/8 ring-1 ring-primary/15`) + label + description; `hover:-translate-y-px hover:shadow-card`
- **Reports & Analytics card**: subtle right-side radial gradient overlay; primary CTA button with arrow icon
- Loading state: `<Spinner>` + "Loading overview…" text
- Error state: `<ErrorState onRetry={() => overview.refetch()} />`

---

## Activity List (`components/admin/activity-list.tsx`)

- Timeline: vertical gradient line + coloured dot per activity type
- Dot and badge colour derived from `type` string
- Item count pill in header

---

## System Health Card (`components/admin/system-health-card.tsx`)

- `animate-ping` dot for healthy services only
- Response time bar: green < 100ms · amber < 300ms · red ≥ 300ms · max = 400ms

---

## Icons (`components/ui/icons.tsx`)

All inline SVG via `BaseIcon` (24×24 viewBox, `stroke="currentColor"`, `strokeWidth="1.8"`).

Available exports: `OverviewIcon, UsersIcon, VisitorIcon, BriefcaseIcon, MegaphoneIcon, CalendarIcon, BellIcon, WalletIcon, SettingsIcon, ClipboardIcon, ChartIcon, UserCircleIcon, ChevronDownIcon, ChevronUpIcon, ArrowsUpDownIcon, EllipsisIcon, DownloadIcon, MenuIcon, MoonIcon, SunIcon, PanelLeftOpenIcon, PanelLeftCloseIcon, SearchIcon, PlusIcon, FilterIcon`

`iconForKey(key: string)` maps sidebar nav keys to icon components.

---

## Patterns to Follow

### Adding a new admin list page
1. Create `app/administrator/[page]/page.tsx`
2. Use `ResourcePage<YourRecord>` as root component
3. Import cell renderers from `@/components/admin/cells`
4. Use `StatusBadge` for status columns
5. Add loading + error guard:
   ```tsx
   if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
   if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
   ```
6. Add route to `lib/config/routes.ts` (`adminNavItems` + `pageTitles`)
7. Add icon key to `iconForKey()` in `components/ui/icons.tsx`

### Buttons
```tsx
// Primary
<button className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-px hover:shadow-float active:translate-y-0">

// Secondary
<button className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-elevated">

// Icon-only (topbar)
<button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-slate-500 shadow-sm transition hover:border-primary/20 hover:text-foreground">
```

### Form inputs (with icon prefix)
```tsx
<div className="relative">
  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
    <SearchIcon className="h-4 w-4" />
  </span>
  <input className="w-full rounded-xl border border-border/80 bg-card py-2.5 pl-10 pr-4 text-sm
    focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10" />
</div>
```

### Dropdowns / floating panels
```
rounded-2xl border border-border/80 bg-card/95 shadow-float backdrop-blur-xl
```

---

## Toasts + Confirm Modals

### Toasts
- Sonner is mounted globally via `app/providers.tsx`.
- Import `toast` from `sonner`.
- Use `toast.success`, `toast.info`, `toast.warning`, `toast.error`.

### Confirm modal
- `components/ui/confirm-provider.tsx` provides `useConfirm()` globally
- `confirm(options)` returns `Promise<boolean>`
- Standard pattern:
```tsx
const accepted = await confirm({
  title: "Archive expo",
  description: "Archive Nairobi Tech Expo and move it out of active operations.",
  confirmLabel: "Archive expo",
  tone: "danger"
})

if (accepted) toast.warning("Nairobi Tech Expo archived")
```

### Interaction rule
- View / Create / Edit → full pages
- Approve / Verify / Suspend / Archive / Retry / Reject / Deactivate / Flag → confirm modal only when a real backend mutation exists
- Result feedback → toast after the API call succeeds or fails

---

## First Full-Page Admin Flows

The first complete CRUD-style pages now exist for:

- `/administrator/organizers/new`
- `/administrator/organizers/[id]`
- `/administrator/organizers/[id]/edit`
- `/administrator/exhibitors/new`
- `/administrator/exhibitors/[id]`
- `/administrator/exhibitors/[id]/edit`
- `/administrator/sponsors/new`
- `/administrator/sponsors/[id]`
- `/administrator/sponsors/[id]/edit`
- `/administrator/expos/new`
- `/administrator/expos/[id]`
- `/administrator/expos/[id]/edit`
- `/administrator/users/new`
- `/administrator/users/[id]`
- `/administrator/users/[id]/edit`
- `/administrator/visitors/[id]`
- `/administrator/notifications/[id]`
- `/administrator/settlements/[id]`
- `/administrator/audit-logs/[id]`

Shared building blocks:
- `components/admin/admin-form-page.tsx`
- `components/admin/detail-card.tsx`
- `lib/admin-entities.ts`

Dynamic title handling for these routes is resolved through `resolvePageMeta(pathname)` in `lib/config/routes.ts`.

### Current admin route coverage
- Organizers: list, new, detail, edit
- Exhibitors: list, new, detail, edit
- Sponsors: list, new, detail, edit
- Expos: list, new, detail, edit
- Payments: list
- Ads: list
- System Users: list, new, detail, edit
- Visitors: list, detail
- Notifications: list, detail
- Settlements: list, detail
- Audit Logs: list, detail

### Detail page expectations
- Organizer detail shows: owned expos, settlements, paid collections, and only visitor relationships returned by backend data
- Expo detail shows: exhibitors, ads, payments, and only visitor/lead/engagement data returned by backend data
- Sponsor detail shows: payments, ads, engagement output
- Settlement detail shows: paid exhibitors, commission, net breakdown

## Admin Account Frontend Pass

- Admin system user list actions now route only to real view/edit pages.
- Organizer, exhibitor, sponsor, visitor, notification, and settlement admin lists no longer include fake approve, verify, suspend, retry, reject, flag, or activate actions that only displayed local toast messages.
- Administrator overview actions now link to actual admin workflows: add system user and create expo.
- `lib/admin-entities.ts` no longer contains hardcoded expo insight data tied to demo expo names.
- Admin detail helpers now prefer empty backend-derived relationship lists over fabricated visitor/lead numbers.

### Settings tabs
- Email
- SMS
- WhatsApp (Twilio)
- Paystack

---

## Things NOT to do

| Don't | Do instead |
|---|---|
| Use raw `blue-500`, `green-600` for brand/status | Use `primary`, `success`, `danger` tokens |
| Add `hover:shadow-float` to `<Card>` base | Add hover effects at the usage site |
| Use `max-w-0` to hide flex children | Use `w-0 overflow-hidden` |
| Share `transition-all` for mobile slide + desktop width | Separate: `transition-transform` (mobile) + `lg:transition-[width]` (desktop) |
| Put `<h1>` + description in topbar | Topbar is 60px only; title lives in `<PageHeader>` inside page content |
| Show raw `window.alert()` for row actions | Use `router.push`, `useConfirm()`, and `toast.*()` |
| Add `flex-1` to an element you also want to collapse | Remove `flex-1` and use `w-0` directly |
| Forget `lg:gap-0` when collapsing sidebar items | Always pair `w-0 opacity-0` label with `lg:gap-0` on the parent |
| Skip error state handling on data pages | Always add `if (query.isError) return <ErrorState onRetry={() => query.refetch()} />` |
| Use `details/summary` for table row action dropdowns | Use `RowActionsDropdown` in `data-table.tsx` (React state, one open at a time) |
