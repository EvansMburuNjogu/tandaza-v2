# Tandaza Frontend — UI/UX Design Guide

> This document is the authoritative reference for all agents and developers working on the Tandaza frontend. Every new page, component, or feature must follow these patterns. Do not deviate without a documented reason.

---

## 1. Design Philosophy

| Principle | What it means in practice |
|---|---|
| **Minimal content** | Every word earns its place. Cut copy until it hurts, then cut one more sentence. |
| **Premium depth** | Use layered gradients, soft glows, and backdrop blur — never flat or lifeless surfaces. |
| **Consistent language** | Every component speaks the same visual dialect: same radius, same shadow scale, same motion curve. |
| **Functional first** | Animations and decorations must never block or slow interaction. Beauty supports usability. |
| **No external icon libraries** | All icons are inline SVGs. `stroke="currentColor"`, `strokeWidth="1.3–1.5"`, `fill="none"` unless filled. |

---

## 2. Colour System

All colours are CSS custom properties consumed via `hsl(var(--token))`. **Never hardcode hex/rgb values** — use tokens.

### Light mode tokens (`globals.css :root`)
```
--background   : 225 25% 97%       /* page background */
--foreground   : 228 20% 14%       /* body text */
--card         : 0 0% 100%         /* card surface */
--elevated     : 224 38% 99%       /* input / raised surface */
--primary      : 234 79% 61%       /* indigo — main brand colour */
--accent       : 262 79% 64%       /* violet — gradient endpoint */
--secondary    : 225 24% 94%       /* subtle fills */
--muted        : 225 20% 95%       /* muted fills */
--border       : 226 19% 87%       /* dividers / input borders */
--success      : 148 63% 42%       /* green */
--warning      : 39 92% 52%        /* amber */
--danger       : 0 76% 58%         /* red */
--ring         : 234 79% 61%       /* focus ring (= primary) */
```

### Dark mode tokens (`[data-theme="dark"]`)
Same names — values shift toward darker surfaces and brighter primaries. Always test in both modes.

### Usage rules
- **Primary gradient**: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)` — used on all CTAs and shimmer borders.
- **Opacity modifiers**: use Tailwind's `/` syntax — `bg-primary/10`, `border-primary/20`, `text-primary/80`.
- **Slate text** (`text-slate-400`, `text-slate-500`) is acceptable for secondary/hint text. Do not use `text-gray-*`.
- **Never use `text-black` or `text-white` directly** except on gradient buttons where the contrast is guaranteed.

---

## 3. Typography

| Role | Class | Notes |
|---|---|---|
| Page heading | `text-[1.65rem] font-bold leading-tight tracking-tight` | Auth card h2 |
| Section heading | `text-2xl font-bold tracking-tight` | Dashboard section titles |
| Eyebrow label | `text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80` | Above headings |
| Body | `text-sm leading-6` or `text-[13px] leading-6` | Default prose |
| Caption / hint | `text-[11px] text-slate-400` | Field hints, trust badges |
| Label | `text-[13px] font-semibold text-foreground` | Form field labels |

Font: **Inter** loaded globally. Feature settings `"cv02","cv03","cv04","cv11"` are enabled in `globals.css`.

---

## 4. Spacing & Layout

- Base unit: `4px` (Tailwind default).
- Card internal padding: `px-7 pb-8 pt-7` (mobile) → `sm:px-9 sm:pb-9 sm:pt-8`.
- Stack spacing inside cards: `space-y-4` for forms, `space-y-1.5` between label and input.
- Section dividers: `<div className="h-px w-full bg-border/50" />` with `my-6` or `my-7`.

---

## 5. Card Anatomy

Every auth/form card follows this exact structure from top to bottom:

```
┌─────────────────────────────────┐
│  ░░░ shimmer border (3px) ░░░   │  ← gradient top line
│─────────────────────────────────│
│  [eyebrow]    [logo badge 44px] │  ← header row
│  [h2 title]                     │
│  [short description]            │
│─────────────────────────────────│  ← h-px divider
│  [form fields]                  │
│  [CTA button]                   │
│─────────────────────────────────│  ← h-px divider (optional)
│  [secondary link / "or" strip]  │
│  [trust badge]                  │
└─────────────────────────────────┘
```

### Card wrapper classes
```tsx
className="rounded-2xl border border-border/50 bg-card/80 shadow-shell backdrop-blur-xl p-0 overflow-hidden"
```

### Shimmer border
Always the first child inside the card:
```tsx
<div
  className="h-[3px] w-full"
  style={{
    background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 40%, hsl(var(--accent)) 70%, transparent 100%)"
  }}
/>
```

### Logo badge (card header, top-right)
```tsx
<span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
  <Image src="/tandaza-logo.svg" alt="Tandaza" width={24} height={24} priority />
</span>
```

---

## 6. Form Fields

### Standard text / email input
```tsx
<div className="space-y-1.5">
  <label htmlFor="id" className="block text-[13px] font-semibold text-foreground">Label</label>
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
      {/* inline SVG icon, h-[15px] w-[15px] */}
    </span>
    <input
      id="id"
      type="text"
      className="w-full rounded-xl border border-border bg-elevated py-3 pl-10 pr-4 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
    />
  </div>
</div>
```

### Password input (with show/hide toggle)
Add `pr-11` to the input. Add a toggle button at `right-3.5`:
```tsx
<button
  type="button"
  onClick={() => setShow(v => !v)}
  className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 transition hover:text-slate-600 focus:outline-none"
  aria-label={show ? "Hide password" : "Show password"}
>
  {show ? <EyeOffIcon /> : <EyeIcon />}
</button>
```

### Select / dropdown
Use the same input class with `appearance-none`. Add a `ChevronIcon` at `right-3.5` with `pointer-events-none`.

### Field hints and validation
```tsx
{/* Inline error / success below a field */}
<p className={`flex items-center gap-1.5 text-[11px] font-medium ${ok ? "text-success" : "text-danger"}`}>
  {ok ? <MatchIcon /> : <NoMatchIcon />}
  {ok ? "Passwords match" : "Passwords do not match"}
</p>
```

---

## 7. Password Strength Indicator

Use this component any time a `new-password` field is present:

```tsx
function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length
  const levels = [
    { label: "Weak",   color: "bg-danger"    },
    { label: "Fair",   color: "bg-warning"   },
    { label: "Good",   color: "bg-success/70"},
    { label: "Strong", color: "bg-success"   },
  ]
  const { label, color } = levels[score - 1] ?? levels[0]
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? color : "bg-border"}`} />
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Strength: <span className="font-semibold text-foreground">{label}</span>
      </p>
    </div>
  )
}
```

Render it only when `password.length > 0`.

---

## 8. CTA Button (Primary Gradient)

The shared auth submit button pattern. **Never use the `<Button>` component for primary CTAs in auth pages** — use this pattern directly for full gradient control:

```tsx
<button
  type="submit"
  disabled={loading}
  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
  style={{
    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
    boxShadow: "0 4px 18px hsl(var(--primary)/0.32)"
  }}
>
  {/* Inner shimmer on hover */}
  <span className="pointer-events-none absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />

  {loading ? (
    <><Spinner className="h-4 w-4" /><span>Loading…</span></>
  ) : (
    <><span>Action label</span><ArrowIcon /></>
  )}
</button>
```

Arrow icon nudges `translate-x-0.5` on `group-hover` for momentum:
```tsx
function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

---

## 9. Secondary / Ghost Actions

### "Back to sign in" link
```tsx
<Link href="/login" className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-primary">
  <BackArrowIcon />
  Back to sign in
</Link>
```

### "Or" divider + secondary text link
```tsx
<div className="relative flex items-center">
  <div className="h-px flex-1 bg-border/50" />
  <span className="mx-3 text-[11px] font-medium text-slate-400">or</span>
  <div className="h-px flex-1 bg-border/50" />
</div>
<p className="text-center text-[13px] text-slate-500">
  Already have an account?{" "}
  <Link href="/login" className="font-semibold text-primary transition hover:underline">Sign in</Link>
</p>
```

### Inline text links
```tsx
<Link href="/..." className="font-semibold text-primary/80 transition hover:text-primary hover:underline">
  Link text
</Link>
```

---

## 10. Status / Info Banners

### Warning banner
```tsx
<div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
  <ShieldAlertIcon /> {/* text-warning, h-4 w-4, flex-shrink-0, mt-0.5 */}
  <p className="text-[12px] leading-5 text-slate-600">Banner message.</p>
</div>
```

### Success state (centered)
```tsx
<div className="flex flex-col items-center py-4 text-center">
  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 ring-1 ring-success/20">
    <CheckIcon /> {/* text-success, h-7 w-7 */}
  </span>
  <p className="mt-4 font-semibold text-foreground">Title</p>
  <p className="mt-1.5 max-w-[260px] text-[13px] leading-6 text-slate-500">Body text.</p>
</div>
```

### Error state (centered)
Same as success but `bg-danger/10 ring-danger/20` and `text-danger` icon.

### Loading state (centered)
```tsx
<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
  <Spinner className="h-7 w-7 text-primary" />
</div>
```

---

## 11. Trust Badge

Place at the very bottom of any authentication card:
```tsx
<div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400/70">
  <ShieldCheckIcon /> {/* h-3 w-3, flex-shrink-0 */}
  <span>Secured with 256-bit SSL encryption</span>
</div>
```

---

## 12. AuthShell — The Layout Wrapper

`components/auth/auth-shell.tsx` renders the two-column auth layout used by every auth page.

### Props
```ts
type AuthShellProps = {
  eyebrow?:        string     // micro label above title (omit when card owns its heading)
  title?:          string
  description?:    string
  children:        ReactNode  // card body content
  panelTitle?:     string     // brand panel headline (default supplied)
  panelKicker?:    string     // brand panel eyebrow (default: "Africa's expo digital platform")
  panelDescription?: string   // accepted but unused — legacy compat
  cardClassName?:  string     // override card wrapper classes
  footer?:         ReactNode  // rendered below the card (legacy — prefer putting links inside card)
  compact?:        boolean    // max-w-[420px] vs max-w-[480px]
}
```

### When to use `eyebrow/title/description` props vs card-owned heading

| Scenario | Use props | Own heading inside children |
|---|---|---|
| Simple single-field forms (forgot-password legacy) | ✓ | |
| Rich cards with logo badge + shimmer border | | ✓ |
| New auth pages | | ✓ (preferred) |

When using card-owned heading, pass `cardClassName="p-0 overflow-hidden"` and render the shimmer border + padding div yourself.

### Brand panel
The left panel is always rendered by `AuthShell`. The panel title and kicker can be customised per page via props. The role cards (Visitor / Exhibitor / Organizer / Sponsor) and decorative SVG rings are static.

---

## 13. Inline SVG Icon Conventions

All icons are inline SVGs. Follow these rules consistently:

```tsx
<svg
  viewBox="0 0 18 18"          // 18×18 is standard; use 16×16 for small, 24×24 for large
  fill="none"                   // always fill="none" for stroked icons
  className="h-[15px] w-[15px]" // size via className
  aria-hidden                    // always on decorative icons
>
  <path stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" ... />
</svg>
```

Stroke widths:
- `1.2` — very fine (badge icons, small decorative)
- `1.3` — standard for 16×16
- `1.35` — standard for 18×18 field icons
- `1.4–1.5` — emphasis / larger icons

Filled elements (dots, circles): `fill="currentColor"` with no stroke.

---

## 14. Auth Page Checklist

When building or updating any auth page, verify:

- [ ] Uses `AuthShell` as the layout wrapper
- [ ] Card has `p-0 overflow-hidden` + shimmer top border (3px gradient)
- [ ] Card header has eyebrow + title + description + logo badge (top-right)
- [ ] Divider `h-px bg-border/50 my-6` separates header from form
- [ ] All inputs have leading icons (`left-3.5`)
- [ ] Password fields have show/hide toggles
- [ ] New-password fields include `<PasswordStrength />`
- [ ] Confirm-password shows live match/mismatch indicator
- [ ] CTA button uses the gradient pattern with `ArrowIcon`
- [ ] Navigation back link is inside the card (not a separate block)
- [ ] Multi-state forms (loading / success / error) have distinct icon badges
- [ ] No external icon imports — all SVGs are inline
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)

---

## 15. Brand Panel Background

The left panel uses a layered approach — do not simplify it:

```
Layer 1: Base gradient
  linear-gradient(160deg, #06050f 0%, #130d35 35%, #1d1250 55%, #0e0826 100%)

Layer 2: Ambient colour blobs (radial gradients, no blur)
  - indigo  rgba(99,102,241,0.45)  — left-center
  - violet  rgba(167,139,250,0.30) — top-right
  - sky     rgba(56,189,248,0.18)  — bottom-center

Layer 3: Dot grid (white dots, opacity 7%)
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)"
  backgroundSize: "30px 30px"

Layer 4: Decorative SVG rings (opacity 8–12%, white strokes)
  - Large concentric compass — right edge, vertically centred
  - Small ring cluster — top-left
  - Node dot graph — bottom-right
```

---

## 16. Motion & Transitions

| Element | Transition |
|---|---|
| All interactive elements | `transition-all duration-150` or `duration-200` |
| CTA button hover lift | `hover:-translate-y-[1px]` |
| Arrow icon on button hover | `group-hover:translate-x-0.5` |
| Hover shimmer overlay | `group-hover:bg-white/[0.06]` |
| Role card hover | `hover:bg-white/[0.09]` |
| Password strength bars | `transition-all duration-300` |
| Dropdown/menu entry | `.animate-dropdown-in` (defined in globals.css) |

**No `transition: all` on layout properties** — always scope to `color, background-color, border-color, box-shadow, opacity, transform`.

---

## 17. File Structure

```
frontend/
├── app/
│   ├── globals.css              ← CSS tokens, keyframes, utility overrides
│   ├── layout.tsx               ← Root layout, font, providers
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   └── change-password/
│       ├── page.tsx
│       └── change-password-form.tsx   ← co-located with page for client component
│
├── components/
│   ├── auth/
│   │   ├── auth-shell.tsx       ← Layout + brand panel + exported auth helpers
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   ├── reset-password-form.tsx
│   │   └── verify-email-form.tsx
│   └── ui/
│       ├── button.tsx           ← General purpose Button (variant/size props)
│       ├── card.tsx             ← Generic card wrapper
│       ├── input.tsx            ← Generic input (use directly in auth pages for icon support)
│       └── spinner.tsx
│
├── tailwind.config.ts           ← Colour tokens, shadow scale, border-radius extensions
└── UIUX_GUIDE.md                ← This file
```

---

## 18. Do / Don't

| Do | Don't |
|---|---|
| Use `hsl(var(--token))` for all colours | Hardcode `#6366f1` or `rgb(...)` |
| Write inline SVGs for icons | Import from lucide-react, heroicons, etc. |
| Keep card copy to ≤ 1 short sentence per field | Write long descriptions or tooltips |
| Use `<PasswordStrength />` on every new-password field | Leave password fields bare |
| Keep all navigation links inside the card | Float them in a separate `<div>` below |
| Test in light and dark mode | Ship untested in one mode |
| Use `AuthShell` for all auth layouts | Build bespoke min-h-screen wrappers |
| `npx tsc --noEmit` before marking done | Ship with TypeScript errors |
| Use `toast.success / toast.error` (sonner) for feedback | Use `alert()` or custom modals |
| Co-locate client components with their page when needed | Put all client code in `/components` for no reason |
