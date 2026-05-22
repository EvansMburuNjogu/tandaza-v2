"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { formatCurrency } from "@/lib/utils"

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

export default function SponsorCampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-campaign", params.id],
    queryFn: () => api.getSponsorCampaign(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading campaign...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Campaign not found" />

  const campaign = data

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title={campaign.name}
          description={campaign.objective}
          actions={<BackLink href="/sponsor/campaigns" label="Back to Campaigns" />}
        />

        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Status</p>
            <div className="mt-1"><StatusBadge value={campaign.status} /></div>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Budget</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(campaign.budget)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Impressions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{campaign.totalImpressions.toLocaleString()}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Clicks</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{campaign.totalClicks.toLocaleString()}</p>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Campaign Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Objective</span>
                <span className="font-medium">{campaign.objective}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Date</span>
                <span className="font-medium">{new Date(campaign.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">End Date</span>
                <span className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Spend</span>
                <span className="font-medium">{formatCurrency(campaign.totalSpend)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Number of Ads</span>
                <span className="font-medium">{campaign.adsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Click-through Rate</span>
                <span className="font-medium">{campaign.totalImpressions > 0 ? ((campaign.totalClicks / campaign.totalImpressions) * 100).toFixed(2) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost per Click</span>
                <span className="font-medium">{formatCurrency(campaign.totalClicks > 0 ? Math.round(campaign.totalSpend / campaign.totalClicks) : 0)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SessionGuard>
  )
}
