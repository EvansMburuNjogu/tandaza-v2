import { ActivityItem } from "@/lib/api/contracts"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

function dotColor(type?: string | null) {
  const t = String(type || "").toLowerCase()
  if (t.includes("user") || t.includes("auth") || t.includes("login")) return "bg-sky-500"
  if (t.includes("expo")) return "bg-violet-500"
  if (t.includes("payment") || t.includes("settlement") || t.includes("finance")) return "bg-emerald-500"
  if (t.includes("sponsor")) return "bg-amber-500"
  if (t.includes("error") || t.includes("fail") || t.includes("warn")) return "bg-red-500"
  return "bg-primary"
}

function badgeCls(type?: string | null) {
  const t = String(type || "").toLowerCase()
  if (t.includes("user") || t.includes("auth") || t.includes("login")) return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20"
  if (t.includes("expo")) return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20"
  if (t.includes("payment") || t.includes("settlement") || t.includes("finance")) return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
  if (t.includes("sponsor")) return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
  if (t.includes("error") || t.includes("fail") || t.includes("warn")) return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
  return "bg-secondary text-slate-600 ring-border dark:text-slate-300"
}

export function ActivityList({ items }: { items?: ActivityItem[] | null }) {
  const safeItems = Array.isArray(items) ? items : []
  return (
    <Card className="overflow-hidden border-border/60 bg-card/90 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5 sm:px-5">
        <h2 className="text-sm font-bold text-foreground">Activity</h2>
        {safeItems.length > 0 && (
          <span className="text-xs font-semibold tabular-nums text-slate-400">{safeItems.length} events</span>
        )}
      </div>

      {/* Rows */}
      {safeItems.length ? (
        <div className="divide-y divide-border/40">
          {safeItems.map((item) => (
            <div key={item.id} className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-elevated/40 active:bg-elevated/60 sm:gap-3.5 sm:px-5 sm:py-4">
              {/* Dot */}
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotColor(item.type))} />
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug text-foreground">{item.title || "Activity"}</p>
                  <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1", badgeCls(item.type))}>
                    {item.type || "update"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.description || "No details provided."}</p>
                <p className="mt-1 text-[10px] text-slate-400">{formatDate(item.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-10 text-sm text-slate-400">No activity recorded yet.</p>
      )}
    </Card>
  )
}
