"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useParams } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

export default function SponsorAdPaymentPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const token = useSessionStore((s) => s.token)

  const { data: ad, isLoading, error } = useQuery({
    queryKey: ["sponsor-ad", params.id],
    queryFn: () => api.getSponsorAd(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const initialized = await api.createSponsorAdPayment(token || "", params.id)
      return api.confirmSponsorAdPayment(token || "", initialized.payment.id)
    },
    onSuccess: () => {
      toast.success("Payment confirmed. Your ad is now awaiting admin approval.")
      queryClient.invalidateQueries({ queryKey: ["sponsor-ad", params.id] })
      queryClient.invalidateQueries({ queryKey: ["sponsor-ads"] })
      queryClient.invalidateQueries({ queryKey: ["sponsor-payments"] })
      router.push(`/sponsor/ads/${params.id}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not complete payment")
  })

  if (isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (error || !ad) return <ErrorState title="Ad not found" />

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Ad Payment"
          description={`Pay the one-off placement fee for ${ad.name}.`}
          actions={<BackLink href={`/sponsor/ads/${params.id}`} label="Back" />}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Order Summary</h3>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Ad</span>
                <span className="font-medium text-foreground">{ad.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Placement</span>
                <span className="font-medium capitalize text-foreground">{ad.placement} ({ad.dimensions})</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Campaign</span>
                <span className="font-medium text-foreground">{ad.campaignName || "Unassigned"}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-4">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-mono text-xl font-bold text-primary">{formatCurrency(ad.budget)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Paystack Checkout</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Local mode confirms a simulated Paystack payment. In production this step will redirect to Paystack and confirm through the webhook.
            </p>
            <Button className="mt-6 w-full" onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending || ad.paymentStatus === "paid"}>
              {ad.paymentStatus === "paid" ? "Already Paid" : paymentMutation.isPending ? "Confirming..." : `Pay ${formatCurrency(ad.budget)}`}
            </Button>
            {ad.paymentStatus !== "paid" && (
              <p className="mt-3 text-center text-xs text-muted">Payment activates review. Admin still controls final publishing.</p>
            )}
          </Card>
        </div>
      </div>
    </SessionGuard>
  )
}
