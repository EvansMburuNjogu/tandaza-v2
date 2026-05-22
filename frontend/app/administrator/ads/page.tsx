"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { AdCreativeThumb, AdPreviewDialog } from "@/components/admin/ad-creative-preview"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { AdRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { DateCell, EntityCell, NumericCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function AdsPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const [previewAd, setPreviewAd] = useState<AdRecord | null>(null)
  const query = useQuery({
    queryKey: ["admin-ads", selectedCountry],
    queryFn: () => api.getAdminAds(token || "", selectedCountry),
    enabled: Boolean(token)
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "paused" | "rejected" }) => api.updateAdminAdStatus(token || "", id, status),
    onSuccess: async () => {
      toast.success("Ad status updated")
      await query.refetch()
    },
    onError: (error) => toast.error("Could not update ad", { description: error instanceof Error ? error.message : "Try again." })
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <>
      <ResourcePage<AdRecord>
        title="Ads"
        description="Inspect ad campaigns created by exhibitors and sponsors across the platform."
        stats={query.data.stats}
        rows={query.data.items}
        exportFileName="ads.csv"
        searchPlaceholder="Search by campaign, owner, or expo..."
        searchText={(r) => `${r.campaignName} ${r.ownerName} ${r.expoName}`}
        statusAccessor={(r) => r.status}
        rowActions={[
          { label: "View ad", onClick: (r) => setPreviewAd(r) },
          { label: "Approve ad", onClick: (r) => statusMutation.mutate({ id: r.id, status: "active" }) },
          { label: "Pause ad", onClick: (r) => statusMutation.mutate({ id: r.id, status: "paused" }) },
          { label: "Reject ad", tone: "danger", onClick: (r) => window.confirm("Reject this ad?") && statusMutation.mutate({ id: r.id, status: "rejected" }) }
        ]}
        emptyTitle="No ads found"
        emptyDescription="No ad campaigns match the current filters."
        columns={[
          { key: "creative", header: "Ad Image", exportValue: (r) => r.mediaUrl || "", render: (r) => <AdCreativeThumb ad={r} onClick={() => setPreviewAd(r)} /> },
          { key: "campaignName", header: "Campaign", sortable: true, sortValue: (r) => r.campaignName, exportValue: (r) => `${r.campaignName} - ${r.expoName}`, render: (r) => <EntityCell primary={r.campaignName} sub={r.expoName} /> },
          { key: "ownerName", header: "Owner", sortable: true, exportValue: (r) => `${r.ownerName} - ${r.ownerRole}`, render: (r) => <div><p className="text-sm font-semibold text-foreground">{r.ownerName}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{r.ownerRole}</p></div> },
          { key: "placement", header: "Placement", sortable: true, exportValue: (r) => r.placement, render: (r) => <span className="text-sm text-slate-500">{r.placement}</span> },
          { key: "impressions", header: "Impressions", sortable: true, sortValue: (r) => r.impressions, exportValue: (r) => r.impressions, render: (r) => <NumericCell value={r.impressions} /> },
          { key: "clicks", header: "Clicks", sortable: true, sortValue: (r) => r.clicks, exportValue: (r) => r.clicks, render: (r) => <NumericCell value={r.clicks} /> },
          { key: "status", header: "Status", sortable: true, exportValue: (r) => r.status, render: (r) => <StatusBadge value={r.status} /> },
          { key: "createdAt", header: "Created", sortable: true, sortValue: (r) => r.createdAt, exportValue: (r) => formatDate(r.createdAt), render: (r) => <DateCell value={r.createdAt} /> }
        ]}
      />
      <AdPreviewDialog ad={previewAd} onClose={() => setPreviewAd(null)} />
    </>
  )
}
