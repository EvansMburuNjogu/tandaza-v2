"use client"

import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { StatCard } from "@/components/admin/stat-card"
import { ReportsChartsSkeleton } from "@/components/admin/reports-charts-skeleton"
import { AIPerformanceSummaryCard } from "@/components/analytics/ai-performance-summary"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"
import { AIAnalyticsSummary, AdministratorReportsResponse, ReportMetric, ReportSeriesItem } from "@/lib/api/contracts"

const ReportsCharts = dynamic(
  () => import("@/components/admin/reports-charts").then((module) => module.ReportsCharts),
  {
    ssr: false,
    loading: () => <ReportsChartsSkeleton />
  }
)

const chartPalette = ["hsl(var(--primary))", "#14b8a6", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6", "#06b6d4"]

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

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const reportData = query.data
  const country = countries.data?.items.find((item) => item.code === selectedCountry)
  const currency = country?.defaultCurrency || "KES"
  const revenueTotal = reportData.revenueSeries.reduce((sum, item) => sum + item.value, 0)
  const engagementTotal = reportData.engagementSeries.reduce((sum, item) => sum + item.value, 0)
  const leadCount = reportData.engagementSeries.find((item) => item.label.toLowerCase() === "leads")?.value || 0
  const engagementStability = engagementTotal > 0 ? Math.round((leadCount / engagementTotal) * 100) : 0
  const notificationCount = reportData.engagementSeries.find((item) => item.label.toLowerCase() === "notifications")?.value || 0
  const expoCount = reportData.engagementSeries.find((item) => item.label.toLowerCase() === "expos")?.value || 0
  const selectedCountryLabel = country ? `${country.name} (${country.code})` : selectedCountry || "All active countries"
  const computedSummary = buildAdminPerformanceSummary(reportData, selectedCountryLabel, currency)

  function handleExport() {
    const metrics = reportData.performance.map((item) => `${item.label},${item.value},${item.delta}`).join("\n")
    const revenue = reportData.revenueSeries.map((item) => `${item.label},${item.value}`).join("\n")
    const engagement = reportData.engagementSeries.map((item) => `${item.label},${item.value}`).join("\n")
    const csv = `Metric,Value,Delta\n${metrics}\n\nRevenue Period,Value\n${revenue}\n\nActivity,Value\n${engagement}`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `admin-reports-${selectedCountry || "all"}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Aggregate platform-wide performance across expos, revenue, activations, leads, notifications, and operating health."
        actions={<Button variant="secondary" onClick={handleExport}>Export CSV</Button>}
      />

      <Card className="relative overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.13),rgba(255,255,255,0)_42%),linear-gradient(230deg,rgba(20,184,166,0.10),transparent_44%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--elevated)))] p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_30%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Executive Platform Pulse</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground">
              Overall Tandaza performance across {selectedCountryLabel}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              This view summarizes country-scoped platform health for operators: revenue, live expo supply, lead demand, notification reach, and activity quality.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PulseCard label="Country Scope" value={selectedCountryLabel} detail="active reporting context" color={chartPalette[0]} />
        <PulseCard label="Expo Supply" value={String(expoCount)} detail="tracked expo records" color={chartPalette[1]} />
        <PulseCard label="Captured Leads" value={String(leadCount)} detail="visitor demand signal" color={chartPalette[2]} />
        <PulseCard label="Notifications" value={String(notificationCount)} detail="delivery workload" color={chartPalette[3]} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportData.performance.map((metric) => (
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <OperationsMix data={reportData.engagementSeries} />
        <FinanceHealth metrics={reportData.performance} revenueTotal={revenueTotal} currency={currency} engagementStability={engagementStability} />
      </div>

      <ReportsCharts data={reportData} />

      <AIPerformanceSummaryCard
        summary={aiSummary.data}
        fallbackSummary={computedSummary}
        queryKey={aiQueryKey}
        onGenerate={() => api.generateAdminReportsAISummary(token || "", selectedCountry)}
      />

      <Card className="p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Top Insights</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Signals worth actioning this week</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">These insights translate raw platform performance into decisions for operations, finance, and product direction.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {reportData.topInsights.map((insight, index) => (
            <div key={insight} className="rounded-2xl border border-border/80 bg-elevated/75 p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                >
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

function PulseCard({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/90 p-5 shadow-card">
      <div className="absolute right-0 top-0 h-20 w-24 rounded-bl-[2.5rem] opacity-10" style={{ backgroundColor: color }} />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
    </Card>
  )
}

function OperationsMix({ data }: { data: ReportSeriesItem[] }) {
  const rows = Array.isArray(data) ? data : []
  const max = Math.max(1, ...rows.map((item) => item.value || 0))
  return (
    <Card className="p-6 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Operations Mix</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Where platform activity is concentrated</h2>
      <div className="mt-6 space-y-4">
        {rows.map((item, index) => {
          const width = Math.max(5, Math.round((item.value / max) * 100))
          const color = chartPalette[index % chartPalette.length]
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {item.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{item.value.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-elevated">
                <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function FinanceHealth({ metrics, revenueTotal, currency, engagementStability }: { metrics: ReportMetric[]; revenueTotal: number; currency: string; engagementStability: number }) {
  const paidVolume = metrics.find((metric) => metric.label.toLowerCase().includes("activation volume"))?.value || String(revenueTotal)
  const delivered = metrics.find((metric) => metric.label.toLowerCase().includes("notifications"))?.value || "0"
  return (
    <Card className="p-6 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Platform Health</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Signals for finance and operations</h2>
      <div className="mt-6 grid gap-3">
        <HealthRow label="Confirmed activation value" value={formatCurrency(Number(paidVolume || 0), currency)} color={chartPalette[0]} />
        <HealthRow label="Engagement stability" value={`${engagementStability}%`} color={chartPalette[1]} />
        <HealthRow label="Notifications delivered" value={delivered} color={chartPalette[2]} />
      </div>
    </Card>
  )
}

function HealthRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-elevated/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      </div>
    </div>
  )
}

function buildAdminPerformanceSummary(data: AdministratorReportsResponse, countryLabel: string, currency: string): AIAnalyticsSummary {
  const revenueTotal = data.revenueSeries.reduce((sum, item) => sum + item.value, 0)
  const leads = data.engagementSeries.find((item) => item.label.toLowerCase() === "leads")?.value || 0
  const notifications = data.engagementSeries.find((item) => item.label.toLowerCase() === "notifications")?.value || 0
  const expos = data.engagementSeries.find((item) => item.label.toLowerCase() === "expos")?.value || 0
  const paidMetric = data.performance.find((item) => item.label.toLowerCase().includes("activation volume"))?.value || String(revenueTotal)
  const notificationMetric = data.performance.find((item) => item.label.toLowerCase().includes("notifications"))?.value || "0"
  const risks = [
    notifications === 0 ? "Notification activity is low; confirm email, SMS, push, and in-app delivery flows are being used for active expos." : "",
    leads === 0 ? "Lead capture is not yet visible in this reporting scope; prioritize visitor QR and remote engagement flows." : "",
    expos === 0 ? "No expo supply appears in this reporting scope; country onboarding or filtering may need review." : ""
  ].filter(Boolean)

  return {
    scope: "admin_country",
    scopeId: "admin_reports",
    countryCode: "",
    status: "fallback",
    generatedAt: "",
    summary: `The ${countryLabel} platform view currently shows ${expos} expo record(s), ${formatCurrency(Number(paidMetric || 0), currency)} in confirmed activation value, ${leads} captured lead(s), and ${notificationMetric} delivered notification(s). This is the operating baseline for revenue, expo supply, visitor demand, and communication reach.`,
    risks: risks.length ? risks : ["No major platform risk is visible from the currently loaded aggregate data."],
    opportunities: [
      "Use high-performing countries or expos as onboarding benchmarks for new markets.",
      "Connect lead capture, notifications, and payments to post-expo reports so organizers can see measurable value.",
      "Review activation revenue alongside delivered notifications to understand whether communication is supporting paid workspace adoption."
    ],
    recommendations: [
      "Track paid activations, visitor leads, and notification delivery together before approving settlements or sponsor reporting.",
      "Investigate any country where expos exist but leads or payments remain low.",
      "Use exported CSV reports for weekly finance and operations review."
    ],
    nextActions: [
      "Open payments and settlements to reconcile confirmed revenue.",
      "Review notifications for failed or pending deliveries.",
      "Compare expo supply against captured leads to identify weak visitor engagement."
    ],
    confidenceNotes: "This summary uses aggregated admin report metrics only: expos, revenue, leads, notifications, and engagement series.",
    sourceMetrics: { revenueTotal, leads, notifications, expos, countryLabel }
  }
}
