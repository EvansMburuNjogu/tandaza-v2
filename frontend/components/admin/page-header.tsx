import { ReactNode } from "react"

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-card backdrop-blur-xl sm:p-6">

      <div className="pointer-events-none absolute right-0 top-0 h-28 w-40 rounded-bl-[4rem] bg-primary/5" />
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-primary/[0.06] to-transparent" />
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }} />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 pl-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Admin workspace</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground lg:text-[1.75rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
    </div>
  )
}
