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
import { formatCurrency } from "@/lib/utils"

export default function OrganizerOverviewPage() {
  const token = useSessionStore((state) => state.token)

  const overview = useQuery({
    queryKey: ["organizer-overview"],
    queryFn: () => api.getOrganizerOverview(token || ""),
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
  const stats = Array.isArray(overview.data.stats) ? overview.data.stats : []
  const activities = Array.isArray(overview.data.activities) ? overview.data.activities : []
  const quickActions = Array.isArray(overview.data.quickActions) ? overview.data.quickActions : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your expos, visitors, revenue, and performance metrics."
        actions={<Link href="/organizer/expos"><Button>Manage Expos</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Commission Earnings</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
              {formatCurrency(overview.data.commissionEarnings.total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">This month</p>
            <p className="text-sm font-semibold text-success">
              +{formatCurrency(overview.data.commissionEarnings.thisMonth)}
            </p>
          </div>
        </div>
        <Link
          href="/organizer/sponsors"
          className="text-sm font-medium text-primary hover:underline"
        >
          View sponsor commissions →
        </Link>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.5fr]">
        <ActivityList items={activities} />
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Quick Actions</p>
            <div className="mt-4 space-y-3">
              {quickActions.map((action) => (
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

      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_100%_50%,rgba(99,102,241,0.07),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Reports & Analytics</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">Track your performance</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Review revenue, visitor engagement, and expo performance in the analytics module.</p>
          </div>
          <Link
            href="/organizer/reports"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-px hover:shadow-float"
          >
            View Reports
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2.5 7h9M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </Card>
    </div>
  )
}
