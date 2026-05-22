"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { BackLink } from "@/components/ui/back-link"
import { api } from "@/lib/api"
import type { CheckoutPaymentMethod, PaystackPaymentChannel, ROIEstimate } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import { formatCurrency, mediaUrl } from "@/lib/utils"
import { toast } from "sonner"

function formatExpoDate(value?: string) {
  if (!value) return "Date pending"
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return "Date pending"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(parsed)
}

const PAYMENT_METHODS_BY_COUNTRY: Record<string, Array<{ value: CheckoutPaymentMethod; label: string; channel: PaystackPaymentChannel }>> = {
  KE: [{ value: "mpesa_ke", label: "M-Pesa", channel: "mobile_money" }],
  UG: [
    { value: "airtel_money_ug", label: "Airtel Money", channel: "mobile_money" },
    { value: "mtn_mobile_money_ug", label: "MTN Mobile Money", channel: "mobile_money" }
  ],
  GH: [
    { value: "mtn_mobile_money_gh", label: "MTN Mobile Money", channel: "mobile_money" },
    { value: "vodafone_cash_gh", label: "Vodafone Cash", channel: "mobile_money" }
  ],
  TZ: [
    { value: "mpesa_tz", label: "M-Pesa", channel: "mobile_money" },
    { value: "airtel_money_tz", label: "Airtel Money", channel: "mobile_money" }
  ],
  RW: [
    { value: "mtn_mobile_money_rw", label: "MTN Mobile Money", channel: "mobile_money" },
    { value: "airtel_money_rw", label: "Airtel Money", channel: "mobile_money" }
  ]
}

const COUNTRY_BY_CURRENCY: Record<string, string> = {
  KES: "KE",
  UGX: "UG",
  GHS: "GH",
  TZS: "TZ",
  RWF: "RW"
}

const CARD_PAYMENT_METHOD: { value: CheckoutPaymentMethod; label: string; channel: PaystackPaymentChannel } = {
  value: "card",
  label: "Card",
  channel: "card"
}

function paymentMethodsForExpo(countryCode?: string, currency?: string) {
  const resolvedCountry = (countryCode || COUNTRY_BY_CURRENCY[(currency || "").toUpperCase()] || "").toUpperCase()
  const countryMethods = PAYMENT_METHODS_BY_COUNTRY[resolvedCountry] || regionalMobileMoneyMethods()
  return [CARD_PAYMENT_METHOD, ...countryMethods]
}

function regionalMobileMoneyMethods() {
  const seen = new Set<CheckoutPaymentMethod>()
  return Object.values(PAYMENT_METHODS_BY_COUNTRY).flat().filter((method) => {
    if (seen.has(method.value)) return false
    seen.add(method.value)
    return true
  })
}

export default function ExpoDetailsPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const client = useQueryClient()
  const [includeAdsAddon, setIncludeAdsAddon] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<CheckoutPaymentMethod[]>(["card"])
  const [roiForm, setRoiForm] = useState({
    estimatedSpend: "",
    notes: ""
  })

  const availableQuery = useQuery({
    queryKey: ["available-expos"],
    queryFn: () => api.getAvailableExpos(token || ""),
    enabled: Boolean(token)
  })

  const expo = useMemo(() => {
    return availableQuery.data?.find(e => e.id === params.id)
  }, [availableQuery.data, params.id])

  const activation = useMutation({
    mutationFn: async () => {
      const selectedPaymentOptions = paymentMethodsForExpo(expo?.countryCode, expo?.currency).filter((method) => paymentMethods.includes(method.value))
      const initialized = await api.createExhibitorActivationPayment(token || "", params.id, `activation_${params.id}_${includeAdsAddon ? "ads" : "base"}_${Date.now()}`, includeAdsAddon, buildROIEstimate(roiForm, expo?.currency || "KES"), channelsFromPaymentMethods(selectedPaymentOptions), paymentMethods)
      if (initialized.requiresRedirect && initialized.authorizationUrl) {
        window.location.assign(initialized.authorizationUrl)
        return initialized
      }
      return api.confirmExhibitorPayment(token || "", initialized.payment.id)
    },
    onSuccess: async (result) => {
      if ("requiresRedirect" in result && result.requiresRedirect) {
        toast.success("Opening Paystack checkout...")
        return
      }
      toast.success("Digital workspace activated.")
      await Promise.all([
        client.invalidateQueries({ queryKey: ["available-expos"] }),
        client.invalidateQueries({ queryKey: ["my-expos"] }),
        client.invalidateQueries({ queryKey: ["exhibitor-overview"] }),
        client.invalidateQueries({ queryKey: ["exhibitor-payments"] })
      ])
      router.push(`/exhibitor/my-expos/${params.id}`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not activate digital workspace")
  })

  if (availableQuery.isError) {
    return <ErrorState onRetry={() => availableQuery.refetch()} />
  }
  if (availableQuery.isLoading || !availableQuery.data) {
    return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  }
  if (!expo) return <ErrorState title="Expo not available" message="This expo is either already active for your company or is not currently available for activation." />

  const amount = expo.pricing.baseFee
  const adsAddonFee = expo.pricing.adsAddonFee || 0
  const subtotalAmount = amount + (includeAdsAddon ? adsAddonFee : 0)
  const processingFee = estimateProcessingFee(subtotalAmount, expo.pricing.processingFeeBps || 0, expo.pricing.processingFee || 0)
  const totalAmount = subtotalAmount + processingFee
  const currency = expo.currency || "KES"
  const venue = expo.venue.name
  const location = expo.venue.address || venue
  const startDate = expo.startDate
  const endDate = expo.endDate
  const coverImage = mediaUrl(expo.coverImage || expo.bannerImage)
  const paymentOptions = paymentMethodsForExpo(expo.countryCode, currency)

  return (
    <div className="space-y-6">
      <BackLink href="/exhibitor/expos" label="Back to Browse Expos" />
      <PageHeader
        title={expo.name}
        description="Activate your company workspace for this expo."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="overflow-hidden p-0">
          <div className="flex aspect-[16/7] min-h-56 items-center justify-center bg-elevated">
            {coverImage ? (
              <img src={coverImage} alt={expo.name} className="h-full w-full object-cover" />
            ) : (
              <div className="px-6 text-center">
                <p className="text-2xl font-semibold tracking-tight text-foreground">{expo.name}</p>
              </div>
            )}
          </div>
          <div className="space-y-5 p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Expo</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{expo.name}</h2>
              {expo.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{expo.description}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Dates" value={`${formatExpoDate(startDate)} - ${formatExpoDate(endDate)}`} />
              <Detail label="Venue" value={location} />
            </div>
          </div>
        </Card>

        <Card className="h-fit p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">One-off activation</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{formatCurrency(totalAmount, currency)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Activates your Tandaza workspace for this expo.</p>

          <div className="mt-6 space-y-3 border-y border-border/70 py-5">
            <PriceLine label="Activation fee" value={formatCurrency(amount, currency)} />
            {adsAddonFee > 0 && (
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/70 bg-elevated/50 p-4 transition hover:border-primary/30">
                <span className="flex gap-3">
                  <input type="checkbox" checked={includeAdsAddon} onChange={(event) => setIncludeAdsAddon(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">Create ads add-on</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">Include a paid ads boost option with this activation.</span>
                  </span>
                </span>
                <span className="whitespace-nowrap text-sm font-semibold text-foreground">{formatCurrency(adsAddonFee, currency)}</span>
              </label>
            )}
            {processingFee > 0 && <PriceLine label="Processing fee" value={formatCurrency(processingFee, currency)} />}
            <PriceLine label="Total" value={formatCurrency(totalAmount, currency)} strong />
          </div>

          <div className="mt-6 rounded-2xl border border-border/70 bg-elevated/40 p-4">
            <p className="text-sm font-semibold text-foreground">How much have you invested in this expo?</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Optional. Add your estimated total expo spend so Tandaza can calculate ROI as leads, meetings, pre-orders, and sales intent come in.</p>
            <div className="mt-4">
              <AmountInput label={`Estimated investment (${currency})`} value={roiForm.estimatedSpend} onChange={(value) => setRoiForm(f => ({ ...f, estimatedSpend: value }))} />
            </div>
            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">Notes</span>
              <textarea
                value={roiForm.notes}
                onChange={(event) => setRoiForm(f => ({ ...f, notes: event.target.value }))}
                placeholder="Add useful context for your team"
                rows={3}
                className="w-full rounded-2xl border border-border/80 bg-card px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-border/70 bg-elevated/40 p-4">
            <p className="text-sm font-semibold text-foreground">Payment options</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Card is selected by default. Local mobile money options appear based on the expo country.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {paymentOptions.map((method) => (
                <label
                  key={method.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(method.value)}
                    onChange={() => setPaymentMethods((current) => togglePaymentMethod(current, method.value))}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={() => activation.mutate()} disabled={activation.isPending}>
            {activation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Opening checkout...
              </span>
            ) : `Activate for ${formatCurrency(totalAmount, currency)}`}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">You will complete payment on Paystack, then return to Tandaza automatically.</p>
        </Card>
      </div>
    </div>
  )
}

function buildROIEstimate(form: { estimatedSpend: string; notes: string }, currency: string): ROIEstimate | undefined {
  const estimatedSpend = toAmount(form.estimatedSpend)
  const notes = form.notes.trim()
  if (estimatedSpend <= 0 && !notes) return undefined
  return { estimatedSpend, currency, notes }
}

function togglePaymentMethod(current: CheckoutPaymentMethod[], value: CheckoutPaymentMethod): CheckoutPaymentMethod[] {
  if (current.includes(value)) {
    const next = current.filter((method) => method !== value)
    return next.length ? next : ["card"]
  }
  return [...current, value]
}

function channelsFromPaymentMethods(methods: Array<{ channel: PaystackPaymentChannel }>): PaystackPaymentChannel[] {
  const channels = methods.map((method) => method.channel)
  return Array.from(new Set(channels.length ? channels : ["card"]))
}

function toAmount(value: string) {
  const number = Number(String(value).replace(/,/g, ""))
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0
}

function estimateProcessingFee(amount: number, feeBps: number, fallback: number) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(feeBps) || feeBps <= 0 || feeBps >= 10000) {
    return fallback || 0
  }
  const gross = (amount * 10000) / (10000 - feeBps)
  return Math.max(Math.round(gross - amount), fallback || 0)
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-elevated/50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  )
}

function PriceLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={strong ? "font-semibold text-foreground" : "text-slate-500"}>{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "font-medium text-slate-600"}>{value}</span>
    </div>
  )
}

function AmountInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        inputMode="numeric"
        className="h-11 w-full rounded-xl border border-border/80 bg-card px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
      />
    </label>
  )
}
