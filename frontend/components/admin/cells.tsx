/**
 * Shared table cell renderers.
 * Import these in page files to keep column definitions clean and consistent.
 */

import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"

/** Coloured initial avatar + primary text + muted sub-text */
export function AvatarCell({
  name,
  sub,
  color
}: {
  name?: string | null
  sub?: string
  color?: string
}) {
  const label = String(name || "Unknown")
  const initials = label
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-indigo-500"
  ]
  const auto = colors[(label.charCodeAt(0) + (label.charCodeAt(1) ?? 0)) % colors.length]

  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", color ?? auto)}>
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

/** Plain text with a muted sub-line — for entity / reference cells without an avatar */
export function EntityCell({ primary, sub }: { primary?: string | null; sub?: string | null }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{primary || "Not available"}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

/** Right-aligned monospace numeric value */
export function NumericCell({ value, suffix }: { value: number | string; suffix?: string }) {
  return (
    <span className="tabular-nums text-sm font-medium text-foreground">
      {value}{suffix}
    </span>
  )
}

/** Currency value — mono, right-aligned intent */
export function CurrencyCell({ value }: { value: string | number }) {
  const display = typeof value === "number" ? value.toLocaleString() : value
  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
      {display}
    </span>
  )
}

/** Date with optional time on a second line */
export function DateCell({ value }: { value?: string | null }) {
  const formatted = formatDate(value)
  // Try to split "Jan 15, 2025 10:30 AM" → date + time
  const match = formatted.match(/^(.+?),\s*(\d{4})\s+(.+)$/)
  if (match) {
    return (
      <div>
        <p className="text-sm text-foreground">{match[1]}, {match[2]}</p>
        <p className="text-xs text-slate-400">{match[3]}</p>
      </div>
    )
  }
  return <span className="text-sm text-foreground">{formatted}</span>
}

/** Inline pill badge — for channel, role, action type labels */
export function PillBadge({
  value,
  tone = "neutral"
}: {
  value: string
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info"
}) {
  const styles: Record<string, string> = {
    neutral: "bg-secondary text-slate-600 ring-border dark:text-slate-300",
    primary: "bg-primary/10 text-primary ring-primary/20",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    danger: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
    info: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20"
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1", styles[tone])}>
      {value}
    </span>
  )
}

/** Role badge with fixed colour per role name */
export function RoleBadge({ role }: { role?: string }) {
  const label = role || "system"
  const tones: Record<string, string> = {
    super_administrator: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20",
    administrator: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20",
    organizer: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    exhibitor: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    sponsor: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    visitor: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    support: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
  }
  const cls = tones[label.toLowerCase()] ?? "bg-secondary text-slate-600 ring-border"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1", cls)}>
      {label.replaceAll("_", " ")}
    </span>
  )
}
