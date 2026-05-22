"use client"

import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { StatCard } from "@/components/admin/stat-card"
import { ReportsChartsSkeleton } from "@/components/admin/reports-charts-skeleton"
import { AIPerformanceSummaryCard } from "@/components/analytics/ai-performance-summary"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"

const ReportsCharts = dynamic(
  () => import("@/components/admin/reports-charts").then((module) => module.ReportsCharts),
  {
    ssr: false,
    loading: () => <ReportsChartsSkeleton />
  }
)

export default function ReportsPage() {
  const token = useSessionStore((state) => state.token)
  const selectedCountry = useAdminCountryStore((state) => state.selectedCountry)
  const query = useQuery({
    queryKey: ["admin-reports", selectedCountry],
    queryFn: () => api.getAdministratorReports(token || "", selectedCountry),
    enabled: Boolean(token)
  })
  const aiQueryKey = ["admin-reports-ai-summary", selectedCountry] as const
  const aiSummary = useQuery({
    queryKey: aiQueryKey,
    queryFn: () => api.getAdminReportsAISummary(token || "", selectedCountry),
    enabled: Boolean(token)
  })
  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries() })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const country = countries.data?.items.find((item) => item.code === selectedCountry)
  const currency = country?.defaultCurrency || "KES"
  const revenueTotal = query.data.revenueSeries.reduce((sum, item) => sum + item.value, 0)
  const engagementTotal = query.data.engagementSeries.reduce((sum, item) => sum + item.value, 0)
  const leadCount = query.data.engagementSeries.find((item) => item.label.toLowerCase() === "leads")?.value || 0
  const engagementStability = engagementTotal > 0 ? Math.round((leadCount / engagementTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Track platform growth, expo performance, revenue momentum, and engagement quality across Tandaza."
      />

      <Card className="relative overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(255,255,255,0)_45%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--elevated)))] p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Executive Pulse</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground">
              Performance signals are trending upward across revenue, lead quality, and sponsor engagement.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              This view is designed for operators who need to spot momentum quickly, understand pressure points, and act before platform health slips.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Revenue Run Rate</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{formatCurrency(revenueTotal, currency)}</p>
              <p className="mt-2 text-sm font-medium text-emerald-600">Confirmed activation volume in the selected country</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Engagement Stability</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{engagementStability}%</p>
              <p className="mt-2 text-sm font-medium text-primary">Lead share across country-scoped activity signals</p>
            </div>
          </div>
        </div>
      </Card>

      <AIPerformanceSummaryCard
        summary={aiSummary.data}
        queryKey={aiQueryKey}
        onGenerate={() => api.generateAdminReportsAISummary(token || "", selectedCountry)}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {query.data.performance.map((metric) => (
          <StatCard
            key={metric.label}
            stat={{
              id: metric.label,
              label: metric.label,
              value: metric.label.toLowerCase().includes("volume") ? formatCurrency(Number(metric.value || 0), currency) : metric.value,
              delta: metric.label.toLowerCase().includes("volume") ? "confirmed volume" : metric.delta,
              trend: "up"
            }}
          />
        ))}
      </div>

      <ReportsCharts data={query.data} />

      <Card className="p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Top Insights</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Signals worth actioning this week</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">These insights translate raw platform performance into decisions for operations, finance, and product direction.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {query.data.topInsights.map((insight, index) => (
            <div key={insight} className="rounded-2xl border border-border/80 bg-elevated/75 p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/10">
                  0{index + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Actionable Insight</span>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{insight}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
