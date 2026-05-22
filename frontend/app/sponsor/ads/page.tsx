"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { AdCreativeThumb } from "@/components/admin/ad-creative-preview"
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

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/10 text-success",
    paused: "bg-amber-500/10 text-amber-600",
    draft: "bg-slate-500/10 text-slate-500",
    pending_payment: "bg-amber-500/10 text-amber-600"
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[value] || styles.draft}`}>
      {value === "pending_payment" ? "Payment Pending" : value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

function PaymentStatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    paid: "bg-success/10 text-success",
    unpaid: "bg-amber-500/10 text-amber-600",
    refunded: "bg-slate-500/10 text-slate-500"
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[value] || styles.unpaid}`}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

export default function SponsorAdsPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-ads"],
    queryFn: () => api.getSponsorAds(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading ads...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load ads" />

  const ads = data

  const filteredAds = ads.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Ads"
          description="Manage your advertisements across placements."
          actions={
            <Link href="/sponsor/ads/new">
              <Button>Create Ad</Button>
            </Link>
          }
        />

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <input
                type="text"
                placeholder="Search ads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 max-w-md rounded-xl border border-border bg-elevated px-4 py-2 text-sm"
              />
            </div>

            <DataTable<typeof ads[0]>
              columns={[
                { key: "creative", header: "Banner", render: (r) => <AdCreativeThumb ad={r} onClick={() => router.push(`/sponsor/ads/${r.id}`)} /> },
                { key: "name", header: "Ad Name", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
                { key: "campaignName", header: "Campaign", render: (r) => <span className="text-sm text-slate-500">{r.campaignName}</span> },
                { key: "placement", header: "Placement", render: (r) => <span className="text-sm capitalize">{r.placement}</span> },
                { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
                { key: "paymentStatus", header: "Payment", render: (r) => <PaymentStatusBadge value={r.paymentStatus} /> },
                { key: "impressions", header: "Impressions", render: (r) => <span className="font-mono">{r.impressions.toLocaleString()}</span> },
                { key: "clicks", header: "Clicks", render: (r) => <span className="font-mono">{r.clicks.toLocaleString()}</span> },
                { key: "actions", header: "Action", render: (r) => (
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/sponsor/ads/${r.id}`)}>View</Button>
                )}
              ]}
              rows={filteredAds}
              pageSize={10}
              emptyTitle="No ads yet"
              emptyDescription="Create your first ad to start advertising."
            />
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
