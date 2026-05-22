"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { useRouter } from "next/navigation"
import Link from "next/link"
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

export default function SponsorCampaignsPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-campaigns"],
    queryFn: () => api.getSponsorCampaigns(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading campaigns...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load campaigns" />

  const campaigns = data

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.objective.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Campaigns"
          description="Manage your advertising campaigns."
          actions={
            <Link href="/sponsor/campaigns/new">
              <Button>Create Campaign</Button>
            </Link>
          }
        />

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 max-w-md rounded-xl border border-border bg-elevated px-4 py-2 text-sm"
              />
            </div>

            <DataTable<typeof campaigns[0]>
            columns={[
              { key: "name", header: "Campaign", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
              { key: "objective", header: "Objective", render: (r) => <span className="text-sm text-slate-500 line-clamp-1">{r.objective}</span> },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "budget", header: "Budget", sortable: true, render: (r) => <span className="font-mono">{formatCurrency(r.budget)}</span> },
              { key: "adsCount", header: "Ads", render: (r) => <span className="font-mono">{r.adsCount}</span> },
              { key: "totalImpressions", header: "Impressions", render: (r) => <span className="font-mono">{r.totalImpressions.toLocaleString()}</span> },
              { key: "actions", header: "Action", render: (r) => (
                <Button size="sm" variant="secondary" onClick={() => router.push(`/sponsor/campaigns/${r.id}`)}>View</Button>
              )}
            ]}
            rows={filteredCampaigns}
            pageSize={10}
            emptyTitle="No campaigns yet"
          emptyDescription="Create your first campaign to start advertising."
            />
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
