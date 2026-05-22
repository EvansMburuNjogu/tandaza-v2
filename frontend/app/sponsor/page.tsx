"use client"

import { useQuery } from "@tanstack/react-query"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

function StatCard({ label, value, subtext, color = "primary" }: { label: string; value: string | number; subtext?: string; color?: "primary" | "success" | "amber" | "purple" }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/5 group-hover:bg-primary/10",
    success: "bg-success/5 group-hover:bg-success/10",
    amber: "bg-amber-500/5 group-hover:bg-amber-500/10",
    purple: "bg-purple-500/5 group-hover:bg-purple-500/10"
  }
  return (
    <Card className="p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-20 h-20 ${colors[color]} rounded-full -mr-10 -mt-10 transition-colors`} />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
      </div>
    </Card>
  )
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/10 text-success",
    paused: "bg-amber-500/10 text-amber-600",
    draft: "bg-slate-500/10 text-slate-500",
    completed: "bg-primary/10 text-primary"
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[value] || styles.draft}`}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

export default function SponsorDashboardPage() {
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-dashboard"],
    queryFn: () => api.getSponsorDashboard(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load dashboard" />

  const stats = data!

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Overview of your campaigns, ads, and performance metrics."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Campaigns" value={stats.totalCampaigns} subtext={`${stats.activeCampaigns} active`} color="primary" />
          <StatCard label="Total Ads" value={stats.totalAds} subtext={`${stats.activeAds} active`} color="purple" />
          <StatCard label="Impressions" value={stats.totalImpressions} color="success" />
          <StatCard label="Total Spend" value={formatCurrency(stats.totalSpend)} color="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center p-4 bg-elevated rounded-xl">
                  <p className="text-2xl font-bold text-foreground">{stats.totalClicks.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Total Clicks</p>
                </div>
                <div className="text-center p-4 bg-elevated rounded-xl">
                  <p className="text-2xl font-bold text-foreground">{stats.averageCtr}%</p>
                  <p className="text-sm text-slate-500">Average CTR</p>
                </div>
                <div className="text-center p-4 bg-elevated rounded-xl">
                  <p className="text-2xl font-bold text-foreground">{stats.activeAds}</p>
                  <p className="text-sm text-slate-500">Active Ads</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Link href="/sponsor/campaigns/new">
                  <Button>Create Campaign</Button>
                </Link>
                <Link href="/sponsor/ads/new">
                  <Button variant="secondary">Create Ad</Button>
                </Link>
                <Link href="/sponsor/reports">
                  <Button variant="secondary">View Reports</Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Ads</h3>
              <Link href="/sponsor/ads" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {stats.recentAds.map((ad) => (
                <div key={ad.id} className="flex items-center justify-between p-4 bg-elevated rounded-xl hover:bg-elevated/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    </div>
                    <div>
                      <p className="font-medium">{ad.name}</p>
                      <p className="text-sm text-slate-500">{ad.campaignName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge value={ad.status} />
                    <p className="text-xs text-slate-500 mt-1">{ad.impressions.toLocaleString()} impressions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
