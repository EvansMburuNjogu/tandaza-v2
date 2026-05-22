import { ReactNode } from "react"
import { Card } from "@/components/ui/card"

export function DetailCard({
  title,
  items,
  actions
}: {
  title: string
  items: Array<{ label: string; value: ReactNode }>
  actions?: ReactNode
}) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/86 shadow-card backdrop-blur-xl">
      {/* Decorative corner accent */}
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-36 rounded-bl-[3rem] bg-primary/[0.04]" />

      {/* Header */}
      <div className="relative flex flex-col gap-4 border-b border-border/60 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 h-9 w-[3px] shrink-0 rounded-full" style={{ background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-primary/70">Details</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">{title}</h2>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>

      {/* Fields grid */}
      <div className="grid gap-3 p-6 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-elevated/50 p-4 shadow-sm transition-colors hover:border-primary/20 hover:bg-elevated/70">
            <div className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary/20 transition-colors group-hover:bg-primary/40" />
            <p className="pl-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
            <div className="mt-2 pl-2 text-sm font-medium text-foreground">{item.value}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
