"use client"

import { FormEvent, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { validateSponsorPlanInput } from "@/lib/admin-validation"
import { SponsorPlanPayload } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"

const fallbackFeatures = { logoPlacement: false, bannerAds: false, socialMedia: false, boothSize: "medium" as const, speakingSlot: false, dedicatedPage: false, emailBlast: false, videoAd: false }

export default function EditSponsorPlanPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["admin-sponsor-plan", params.id], queryFn: () => api.getAdminSponsorPlan(token || "", params.id), enabled: Boolean(token && params.id) })
  const [values, setValues] = useState<SponsorPlanPayload | null>(null)
  const [priceText, setPriceText] = useState("")
  const [commissionText, setCommissionText] = useState("")

  useEffect(() => {
    if (query.data) {
      const { id, createdAt, ...payload } = query.data
      setValues({ ...payload, features: payload.features || fallbackFeatures })
      setPriceText(String(payload.price))
      setCommissionText(String(payload.organizerCommissionPercent))
    }
  }, [query.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values) return
    const payload = {
      ...values,
      price: Number(priceText),
      organizerCommissionPercent: Number(commissionText)
    }
    if (!validateSponsorPlanInput(payload)) return
    try {
      await api.updateAdminSponsorPlan(token || "", params.id, payload)
      toast.success("Sponsor plan updated")
      router.push(`/administrator/sponsor-plans/${params.id}`)
    } catch (error) {
      toast.error("Could not update sponsor plan", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  if (query.isLoading || !values) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <AdminFormPage title="Edit Sponsor Plan" description="Update sponsor package pricing and commission." backHref={`/administrator/sponsor-plans/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Name</label><Input required minLength={2} maxLength={80} placeholder="Gold Sponsor" value={values.name} onChange={(e) => setValues((v) => v && ({ ...v, name: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Description</label><Input maxLength={180} placeholder="High visibility package for national sponsors" value={values.description} onChange={(e) => setValues((v) => v && ({ ...v, description: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Tier</label><select value={values.tier} onChange={(e) => setValues((v) => v && ({ ...v, tier: e.target.value as SponsorPlanPayload["tier"] }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm"><option value="bronze">bronze</option><option value="silver">silver</option><option value="gold">gold</option><option value="platinum">platinum</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Billing Cycle</label><select value={values.billingCycle} onChange={(e) => setValues((v) => v && ({ ...v, billingCycle: e.target.value as SponsorPlanPayload["billingCycle"] }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm"><option value="monthly">monthly</option><option value="annual">annual</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Currency</label><Input required readOnly placeholder="Plan country currency" value={values.currency} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Price</label><Input required type="number" inputMode="numeric" min={0} step={1} placeholder={`50000 ${values.currency}`} value={priceText} onChange={(e) => setPriceText(e.target.value)} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Organizer Commission %</label><Input required type="number" inputMode="decimal" min={0} max={100} step={0.01} placeholder="20" value={commissionText} onChange={(e) => setCommissionText(e.target.value)} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Status</label><select value={values.status} onChange={(e) => setValues((v) => v && ({ ...v, status: e.target.value as SponsorPlanPayload["status"] }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm"><option value="active">active</option><option value="inactive">inactive</option><option value="archived">archived</option></select></div>
      </div>
    </AdminFormPage>
  )
}
