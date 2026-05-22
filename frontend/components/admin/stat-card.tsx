import { DashboardStat } from "@/lib/api/contracts"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { iconForKey } from "@/components/ui/icons"

function TrendArrow({ trend }: { trend: string }) {
  if (trend === "up") {
    return (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 9.5V2.5M6 2.5L2.5 6M6 2.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (trend === "down") {
    return (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 2.5V9.5M6 9.5L2.5 6M6 9.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function StatCard({ stat }: { stat: DashboardStat }) {
  const statIconKey: Record<string, string> = {
    expos: "expos", visitors: "visitors", exhibitors: "exhibitors",
    organizers: "organizers", payments: "payments", users: "users",
    sponsors: "handshake", reports: "reports", settlements: "settlements"
  }
  const iconKey = statIconKey[stat.id] ?? "overview"
  const Icon = iconForKey(iconKey)
  const accent = statAccent(stat.id)

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/86 p-5 shadow-card backdrop-blur-xl hover:-translate-y-px hover:border-primary/25 hover:shadow-float sm:p-6">
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1", accent.bar)} />
      <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-32 bg-gradient-to-tl from-elevated/80 to-transparent" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-2xl ring-1", accent.icon)}>
            <Icon className="h-[15px] w-[15px]" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{stat.label}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1", accent.badge)}>
          Live
        </span>
      </div>

      <p className="mt-6 text-[2.35rem] font-bold tabular-nums leading-none tracking-tight text-foreground">{stat.value}</p>

      <div className="relative mt-5 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            stat.trend === "up" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
            stat.trend === "down" && "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
            stat.trend === "neutral" && "bg-secondary text-slate-500 ring-1 ring-border"
          )}
        >
          <TrendArrow trend={stat.trend} />
          {stat.delta}
        </span>
        <span className="text-xs text-slate-400">vs previous period</span>
      </div>
    </Card>
  )
}

function statAccent(id: string) {
  if (id.includes("payment") || id.includes("revenue") || id.includes("settlement")) {
    return {
      bar: "bg-[linear-gradient(90deg,hsl(var(--success)),hsl(var(--primary)/0.35),transparent)]",
      icon: "bg-success/10 text-success ring-success/15",
      badge: "bg-success/10 text-success ring-success/15"
    }
  }
  if (id.includes("visitor") || id.includes("lead")) {
    return {
      bar: "bg-[linear-gradient(90deg,hsl(var(--accent)),hsl(var(--primary)/0.4),transparent)]",
      icon: "bg-accent/10 text-accent ring-accent/15",
      badge: "bg-accent/10 text-accent ring-accent/15"
    }
  }
  if (id.includes("exhibitor") || id.includes("sponsor")) {
    return {
      bar: "bg-[linear-gradient(90deg,hsl(var(--warning)),hsl(var(--primary)/0.35),transparent)]",
      icon: "bg-warning/10 text-warning ring-warning/15",
      badge: "bg-warning/10 text-warning ring-warning/15"
    }
  }
  return {
    bar: "bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)/0.45),transparent)]",
    icon: "bg-primary/8 text-primary ring-primary/15",
    badge: "bg-primary/8 text-primary ring-primary/15"
  }
}
