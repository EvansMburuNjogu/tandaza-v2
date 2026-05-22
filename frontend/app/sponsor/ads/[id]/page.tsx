"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    pending_payment: "bg-amber-500/10 text-amber-600",
    rejected: "bg-danger/10 text-danger"
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[value] || styles.draft}`}>
      {value === "pending_payment" ? "Payment Pending" : value === "draft" ? "In Review" : value.charAt(0).toUpperCase() + value.slice(1)}
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

const PLACEMENT_PRICES: Record<string, number> = {
  banner: 15000,
  sidebar: 10000,
  popup: 20000,
  video: 25000
}

export default function SponsorAdDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-ad", params.id],
    queryFn: () => api.getSponsorAd(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading ad...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Ad not found" />

  const ad = data

  const handlePayment = () => {
    router.push(`/sponsor/ads/${params.id}/payment`)
  }

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title={ad.name}
          description={`${ad.placement} - ${ad.dimensions}`}
          actions={<BackLink href="/sponsor/ads" label="Back to Ads" />}
        />

        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Status</p>
            <div className="mt-1"><StatusBadge value={ad.status} /></div>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Payment</p>
            <div className="mt-1"><PaymentStatusBadge value={ad.paymentStatus} /></div>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Impressions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{ad.impressions.toLocaleString()}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Clicks</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{ad.clicks.toLocaleString()}</p>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ad Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign</span>
                <span className="font-medium">{ad.campaignName || "Unassigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placement</span>
                <span className="font-medium capitalize">{ad.placement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dimensions</span>
                <span className="font-medium">{ad.dimensions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Media Type</span>
                <span className="font-medium capitalize">{ad.mediaType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium">{formatCurrency(ad.budget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CTR</span>
                <span className="font-medium">{ad.ctr}%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            <div className="bg-elevated rounded-xl p-4 flex items-center justify-center min-h-[200px]">
              {ad.mediaUrl ? (
                <img src={ad.mediaUrl} alt={ad.name} className="max-w-full max-h-[180px] object-contain" />
              ) : (
                <div className="text-center text-slate-400">
                  <p className="text-sm">No media uploaded</p>
                  <p className="text-xs mt-1">Upload an image or video to preview</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {ad.paymentStatus === "unpaid" && (
          <Card className="p-6 border-2 border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Payment Required</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This ad requires payment of {formatCurrency(ad.budget || PLACEMENT_PRICES[ad.placement])} before admin review.
                </p>
              </div>
              <Button onClick={handlePayment}>Pay Now</Button>
            </div>
          </Card>
        )}
        {ad.paymentStatus === "paid" && ad.status === "draft" && (
          <Card className="border-primary/20 p-6">
            <h3 className="text-lg font-semibold">Awaiting Admin Approval</h3>
            <p className="mt-1 text-sm text-muted">Payment is complete. The platform team can now approve or reject this ad from the administrator Ads page.</p>
          </Card>
        )}
      </div>
    </SessionGuard>
  )
}
