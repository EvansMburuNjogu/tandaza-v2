"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { OrganizerReportsCharts } from "@/components/organizer/organizer-reports-charts"
import { AIPerformanceSummaryCard } from "@/components/analytics/ai-performance-summary"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { cn } from "@/lib/utils"
import { ReportSeriesItem } from "@/lib/api/contracts"

type ReportTab = "overview" | "expo" | "exhibitor" | "lead" | "settlement" | "engagement" | "visitor"

export default function OrganizerReportsPage() {
  const token = useSessionStore((state) => state.token)
  const [activeTab, setActiveTab] = useState<ReportTab>("overview")
  
  const query = useQuery({
    queryKey: ["organizer-reports"],
    queryFn: () => api.getOrganizerReports(token || ""),
    enabled: Boolean(token)
  })
  const aiQueryKey = ["organizer-reports-ai-summary"] as const
  const aiSummary = useQuery({
    queryKey: aiQueryKey,
    queryFn: () => api.getOrganizerReportsAISummary(token || ""),
    enabled: Boolean(token)
  })

  const handleExport = () => {
    const data = query.data
    if (!data) return
    const expoPerformance = Array.isArray(data.expoPerformance) ? data.expoPerformance : []
    const revenueSeries = Array.isArray(data.revenueSeries) ? data.revenueSeries : []
    const engagementSeries = Array.isArray(data.engagementSeries) ? data.engagementSeries : []
    const visitorDemographics = Array.isArray(data.visitorDemographics) ? data.visitorDemographics : []

    let content = ""
    let filename = ""

    switch (activeTab) {
      case "expo":
        filename = "expo-report"
        content = "Metric,Value,Delta\n" + expoPerformance.map(m => `${m.label},${m.value},${m.delta}`).join("\n")
        break
      case "exhibitor":
        filename = "exhibitor-report"
        content = "Status,Count\n" + (data.exhibitorSeries || []).map(r => `${r.label},${r.value}`).join("\n")
        break
      case "lead":
        filename = "lead-report"
        content = "Status,Count\n" + (data.leadStatusSeries || []).map(r => `${r.label},${r.value}`).join("\n")
        break
      case "settlement":
        filename = "settlement-report"
        content = "Metric,Value\n" + ((data.settlementSeries || []).length ? data.settlementSeries || [] : revenueSeries).map(r => `${r.label},${r.value}`).join("\n")
        break
      case "engagement":
        filename = "engagement-report"
        content = "Day,Engagement %\n" + engagementSeries.map(e => `${e.label},${e.value}`).join("\n")
        break
      case "visitor":
        filename = "visitor-report"
        content = "Region,Visitors %\n" + visitorDemographics.map(v => `${v.label},${v.value}`).join("\n")
        break
    }

    const blob = new Blob([content], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  const expoPerformance = Array.isArray(query.data.expoPerformance) ? query.data.expoPerformance : []
  const topInsights = Array.isArray(query.data.topInsights) ? query.data.topInsights : []
  const exhibitorSeries = query.data.exhibitorSeries || []
  const leadStatusSeries = query.data.leadStatusSeries || []
  const leadTemperatureSeries = query.data.leadTemperatureSeries || []
  const paymentStatusSeries = query.data.paymentStatusSeries || []
  const settlementSeries = query.data.settlementSeries || []
  const expoLifecycleSeries = query.data.expoLifecycleSeries || []

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "expo" as const, label: "Expo Reports" },
    { id: "exhibitor" as const, label: "Exhibitors" },
    { id: "lead" as const, label: "Leads" },
    { id: "settlement" as const, label: "Settlement Reports" },
    { id: "engagement" as const, label: "Engagement Reports" },
    { id: "visitor" as const, label: "Visitor Reports" }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Track your expo performance, revenue, visitor engagement, and export reports."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>Export CSV</Button>
          </div>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border/80 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-slate-500 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AIPerformanceSummaryCard
        summary={aiSummary.data}
        queryKey={aiQueryKey}
        onGenerate={() => api.generateOrganizerReportsAISummary(token || "")}
      />

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {expoPerformance.slice(0, 4).map((metric) => (
              <Card key={metric.label} className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.delta}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <SeriesCard title="Expo Lifecycle" subtitle="Where your expos sit operationally" data={expoLifecycleSeries} />
            <SeriesCard title="Exhibitor Activation" subtitle="Workspace assignment health" data={exhibitorSeries} />
            <SeriesCard title="Payment Health" subtitle="Payment status distribution" data={paymentStatusSeries} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SeriesCard title="Settlement Breakdown" subtitle="Revenue, commission, retained value, and pending payout" data={settlementSeries} />
            <SeriesCard title="Lead Temperature" subtitle="Sales-readiness across expo leads" data={leadTemperatureSeries} />
          </div>
        </div>
      )}

      {activeTab === "expo" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {expoPerformance.map((metric) => (
              <Card key={metric.label} className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.delta}</p>
              </Card>
            ))}
          </div>
          <SeriesCard title="Expo Lifecycle" subtitle="Lifecycle distribution across your expos" data={expoLifecycleSeries} />
        </div>
      )}

      {activeTab === "exhibitor" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <SeriesCard title="Exhibitor Status" subtitle="Assigned exhibitors by activation state" data={exhibitorSeries} />
          <SeriesCard title="Payment Status" subtitle="Payment outcomes connected to exhibitor activations" data={paymentStatusSeries} />
        </div>
      )}

      {activeTab === "lead" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <SeriesCard title="Lead Status" subtitle="Post-expo lead pipeline stages" data={leadStatusSeries} />
          <SeriesCard title="Lead Temperature" subtitle="Hot, warm, and cold lead mix" data={leadTemperatureSeries} />
        </div>
      )}

      {activeTab === "settlement" && (
        <div className="space-y-6">
          <SeriesCard title="Settlement Breakdown" subtitle="Organizer commission and platform retained value" data={settlementSeries} />
          <OrganizerReportsCharts data={query.data} view="settlement" />
        </div>
      )}

      {activeTab === "engagement" && (
        <div className="space-y-6">
          <OrganizerReportsCharts data={query.data} view="engagement" />
        </div>
      )}

      {activeTab === "visitor" && (
        <div className="space-y-6">
          <OrganizerReportsCharts data={query.data} view="visitor" />
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Top Insights</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Key takeaways for your expos</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {topInsights.map((insight, index) => (
            <div key={insight} className="rounded-2xl border border-border/80 bg-elevated/75 p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/10">
                  0{index + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Insight</span>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{insight}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SeriesCard({ title, subtitle, data }: { title: string; subtitle: string; data: ReportSeriesItem[] }) {
  const rows = Array.isArray(data) ? data : []
  const max = Math.max(1, ...rows.map((item) => Number(item.value) || 0))
  return (
    <Card className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{subtitle}</h2>
      <div className="mt-6 space-y-4">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-elevated/50 p-6 text-center text-sm text-slate-500">
            No analytics data yet
          </div>
        )}
        {rows.map((item) => {
          const value = Number(item.value) || 0
          const width = Math.max(4, Math.round((value / max) * 100))
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-sm font-semibold tabular-nums text-primary">{value.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-elevated">
                <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
