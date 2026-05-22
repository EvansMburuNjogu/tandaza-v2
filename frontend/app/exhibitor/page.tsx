"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ActivityList } from "@/components/admin/activity-list"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { StatCard } from "@/components/admin/stat-card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

export default function ExhibitorOverviewPage() {
  const token = useSessionStore((state) => state.token)

  const overview = useQuery({
    queryKey: ["exhibitor-overview"],
    queryFn: () => api.getExhibitorOverview(token || ""),
    enabled: Boolean(token)
  })

  if (overview.isError) return <ErrorState onRetry={() => overview.refetch()} />

  if (overview.isLoading || !overview.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Turn every workspace visitor into a trackable sales opportunity."
        actions={<div className="flex flex-wrap gap-2"><Link href="/exhibitor/my-expos"><Button variant="secondary">My Expos</Button></Link><Link href="/exhibitor/expos"><Button>Browse Expos</Button></Link></div>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.data.stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.5fr]">
        <ActivityList items={overview.data.activities} />
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Quick Actions</p>
            <div className="mt-4 space-y-3">
              {overview.data.quickActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group flex items-start gap-3 rounded-xl p-2 transition hover:bg-elevated/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{action.label}</p>
                    <p className="text-[12px] text-slate-500">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
