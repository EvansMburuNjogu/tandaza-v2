"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { AIPerformanceSummaryCard } from "@/components/analytics/ai-performance-summary"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { formatCurrency } from "@/lib/utils"

function StatCard({ label, value, color = "primary" }: { label: string; value: string | number; color?: "primary" | "success" | "amber" | "purple" }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/5 group-hover:bg-primary/10",
    success: "bg-success/5 group-hover:bg-success/10",
    amber: "bg-amber-500/5 group-hover:bg-amber-500/10",
    purple: "bg-purple-500/5 group-hover:bg-purple-500/10"
  }
  const dotColors: Record<string, string> = {
    primary: "bg-primary",
    success: "bg-success",
    amber: "bg-amber-500",
    purple: "bg-purple-500"
  }
  return (
    <Card className="p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-20 h-20 ${colors[color]} rounded-full -mr-10 -mt-10 transition-colors`} />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </div>
    </Card>
  )
}

export default function SponsorReportsPage() {
  const token = useSessionStore((s) => s.token)
  const [dateRange, setDateRange] = useState("7days")

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-reports", dateRange],
    queryFn: () => api.getSponsorReports(token || ""),
    enabled: Boolean(token)
  })
  const aiQueryKey = ["sponsor-reports-ai-summary"] as const
  const aiSummary = useQuery({
    queryKey: aiQueryKey,
    queryFn: () => api.getSponsorReportsAISummary(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading reports...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load reports" />

  const reports = data

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Reports & Analytics"
          description="Track your campaign performance, impressions, clicks, and ROI."
        />

        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-xl border border-border bg-elevated px-4 py-2 text-sm"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total Impressions" value={reports.overview.impressions.toLocaleString()} color="primary" />
          <StatCard label="Total Clicks" value={reports.overview.clicks.toLocaleString()} color="success" />
          <StatCard label="Average CTR" value={`${reports.overview.ctr}%`} color="purple" />
          <StatCard label="Total Spend" value={formatCurrency(reports.overview.spend)} color="amber" />
        </div>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
            <div className="h-48 flex items-end justify-between gap-2">
              {reports.trends.map((day: { date: string; impressions: number }, index: number) => (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div
                    className="w-full bg-gradient-to-t from-primary/30 to-primary/10 rounded-t group-hover:from-primary/40 group-hover:to-primary/20 transition-all"
                    style={{ height: `${Math.max((day.impressions / 70000) * 100, 10)}%`, minHeight: "20px" }}
                  />
                  <span className="text-[10px] text-slate-500 mt-2">{new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-4">Campaign Performance</h3>
            <div className="space-y-3">
              {reports.campaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 bg-elevated rounded-xl hover:bg-elevated/80 transition-colors">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-slate-500">{campaign.status}</p>
                  </div>
                  <div className="text-right grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{campaign.totalImpressions.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Impressions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{campaign.totalClicks.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Clicks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(campaign.totalSpend)}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Spend</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <AIPerformanceSummaryCard
          summary={aiSummary.data}
          queryKey={aiQueryKey}
          onGenerate={() => api.generateSponsorReportsAISummary(token || "")}
        />
      </div>
    </SessionGuard>
  )
}
