"use client"

import { useQuery } from "@tanstack/react-query"
import { ActivityList } from "@/components/admin/activity-list"
import { SystemHealthCard } from "@/components/admin/system-health-card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { DashboardStat } from "@/lib/api/contracts"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"
import { cn } from "@/lib/utils"

export default function AdministratorOverviewPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)

  const overview = useQuery({
    queryKey: ["admin-overview", selectedCountry],
    queryFn:  () => api.getAdministratorOverview(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  if (overview.isLoading || !overview.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    )
  }

  if (overview.isError) return <ErrorState onRetry={() => overview.refetch()} />

  const stats = overview.data.stats.filter((s) => s.id !== "countries").slice(0, 4)

  return (
    <div className="space-y-5 pb-10">

      {/* Stat bar */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-card">
        <div className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-4 sm:divide-y-0">
          {stats.map((stat) => <StatColumn key={stat.id} stat={stat} />)}
        </div>
      </div>

      {/* Activity + Services */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
        <ActivityList items={overview.data.activities} />
        <SystemHealthCard items={overview.data.systemHealth} />
      </div>

    </div>
  )
}

function StatColumn({ stat }: { stat: DashboardStat }) {
  const isUp   = stat.trend === "up"
  const isDown = stat.trend === "down"

  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
      <p className="text-[1.6rem] font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-[1.85rem]">
        {stat.value}
      </p>
      <span className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
        isUp   && "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
        isDown && "bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
        !isUp && !isDown && "bg-secondary text-slate-500 ring-border"
      )}>
        {isUp && (
          <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isDown && (
          <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {stat.delta}
      </span>
    </div>
  )
}
