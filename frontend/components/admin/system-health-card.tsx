import { SystemHealthItem } from "@/lib/api/contracts"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function statusCls(status: string) {
  const s = status.toLowerCase()
  if (s.includes("healthy") || s.includes("active") || s.includes("live"))
    return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20", pulse: true }
  if (s.includes("warn") || s.includes("degraded"))
    return { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20", pulse: false }
  return { dot: "bg-red-500", badge: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20", pulse: false }
}

export function SystemHealthCard({ items }: { items: SystemHealthItem[] }) {
  const healthy = items.filter((i) => statusCls(i.status).pulse).length

  return (
    <Card className="overflow-hidden border-border/60 bg-card/90 shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5 sm:px-5">
        <h2 className="text-sm font-bold text-foreground">Services</h2>
        {items.length > 0 && (
          <span className="text-xs font-semibold text-slate-400">
            <span className="text-emerald-600">{healthy}</span>/{items.length} healthy
          </span>
        )}
      </div>

      {items.length ? (
        <div className="divide-y divide-border/40">
          {items.map((item) => {
            const cfg = statusCls(item.status)
            const ms  = item.responseTimeMs
            const msColor = ms < 100 ? "text-emerald-600" : ms < 300 ? "text-amber-600" : "text-red-600"
            return (
              <div key={item.service} className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  {cfg.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", cfg.dot)} />}
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.service}</p>
                <span className={cn("text-[11px] font-semibold tabular-nums", msColor)}>{ms}ms</span>
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1", cfg.badge)}>
                  {item.status}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="px-5 py-8 text-sm text-slate-400">No service data yet.</p>
      )}
    </Card>
  )
}
