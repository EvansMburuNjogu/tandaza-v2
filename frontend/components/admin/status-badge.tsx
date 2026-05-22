import { cn } from "@/lib/utils"

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info"

function resolveTone(tone: string): BadgeTone {
  if (tone.includes("active") || tone.includes("verified") || tone.includes("approved") || tone.includes("delivered") || tone.includes("healthy") || tone.includes("live")) return "success"
  if (tone.includes("pending") || tone.includes("submitted") || tone.includes("queued") || tone.includes("warning") || tone.includes("upcoming")) return "warning"
  if (tone.includes("suspended") || tone.includes("failed") || tone.includes("degraded") || tone.includes("archived") || tone.includes("inactive") || tone.includes("rejected")) return "danger"
  if (tone.includes("disbursed")) return "info"
  return "neutral"
}

const toneStyles: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-500/20",
    dot: "bg-emerald-500 dark:bg-emerald-400"
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-500/20",
    dot: "bg-amber-500 dark:bg-amber-400"
  },
  danger: {
    badge: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/12 dark:text-red-300 dark:ring-red-500/20",
    dot: "bg-red-500 dark:bg-red-400"
  },
  info: {
    badge: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-500/20",
    dot: "bg-sky-500 dark:bg-sky-400"
  },
  neutral: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/12 dark:text-slate-300 dark:ring-slate-500/20",
    dot: "bg-slate-400 dark:bg-slate-500"
  }
}

export function StatusBadge({ value }: { value?: string | null }) {
  const label = String(value || "unknown")
  const { badge, dot } = toneStyles[resolveTone(label.toLowerCase())]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1", badge)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      {label.replaceAll("_", " ")}
    </span>
  )
}
