"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { ImageUploadField } from "@/components/media/image-upload-field"
import { api } from "@/lib/api"
import { validateExpoInput } from "@/lib/admin-validation"
import { availableCountries } from "@/lib/country-options"
import { timezoneOptions } from "@/lib/timezones"
import { ExpoPayload, ExpoStatus, OrganizerRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"

const statusOptions: ExpoStatus[] = ["draft", "submitted_for_review", "needs_changes", "approved", "published", "live", "completed", "settlement_pending", "settled", "archived"]

export default function EditExpoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const expo = useQuery({ queryKey: ["admin-expo", params.id], queryFn: () => api.getAdminExpo(token || "", params.id), enabled: Boolean(token && params.id) })
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.getCategories(token || ""), enabled: Boolean(token) })
  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries() })
  const [values, setValues] = useState({
    name: "", description: "", organizerId: "", countryCode: "KE", city: "", venue: "", currencyCode: "KES", timezone: "Africa/Nairobi",
    coverImageUrl: "", activationFee: "0", adsAddonFee: "0", commissionRate: "0", status: "draft" as ExpoStatus, startDate: "", endDate: "", categoryIds: [] as string[]
  })
  const organizers = useQuery({ queryKey: ["admin-organizers", values.countryCode], queryFn: () => api.getAdminOrganizers(token || "", values.countryCode), enabled: Boolean(token && values.countryCode) })

  useEffect(() => {
    if (!expo.data) return
    setValues({
      name: expo.data.name,
      description: expo.data.description || "",
      organizerId: expo.data.organizerId || "usr_organizer_001",
      countryCode: expo.data.countryCode || "KE",
      city: expo.data.city || "",
      venue: expo.data.venue || expo.data.location,
      currencyCode: expo.data.currency,
      timezone: expo.data.timezone || "Africa/Nairobi",
      coverImageUrl: expo.data.coverImageUrl || expo.data.coverImage || "",
      activationFee: String(expo.data.exhibitorFee || 0),
      adsAddonFee: String(expo.data.adsAddonFee || 0),
      commissionRate: String(expo.data.organizerCommissionRate || 0),
      status: expo.data.status,
      startDate: expo.data.startDate,
      endDate: expo.data.endDate,
      categoryIds: expo.data.categories?.map((category) => category.id) || []
    })
  }, [expo.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateExpoInput(values)) return
    await api.updateAdminExpo(token || "", params.id, toPayload(values))
    toast.success("Expo changes saved")
    router.push(`/administrator/expos/${params.id}`)
  }

  if (expo.isLoading || categories.isLoading || countries.isLoading || organizers.isLoading || !expo.data || !categories.data || !countries.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (expo.isError) return <ErrorState onRetry={() => expo.refetch()} />
  if (categories.isError || organizers.isError) return <ErrorState onRetry={() => { categories.refetch(); organizers.refetch() }} />
  if (countries.isError) return <ErrorState onRetry={() => countries.refetch()} />

  const countryOptions = availableCountries(countries.data.items)
  const activeOrganizers = (organizers.data?.items || []).filter((organizer) => organizer.status === "verified")
  const timezones = timezoneOptions(values.timezone)

  return (
    <AdminFormPage title="Edit Expo" description="Update expo details, activation pricing, commission, and lifecycle status." backHref={`/administrator/expos/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Expo Name"><Input required minLength={3} maxLength={140} placeholder="Nairobi Tech Expo" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></Field>
        <Field label="Organizer"><OrganizerSelect organizers={activeOrganizers} value={values.organizerId} currentName={expo.data.organizer} onChange={(organizerId) => setValues((v) => ({ ...v, organizerId }))} /></Field>
        <Field label="Description" wide><Textarea required minLength={10} maxLength={800} rows={3} placeholder="Describe the expo, audience, sectors, and remote access value." value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></Field>
        <div className="md:col-span-2">
          <ImageUploadField token={token || ""} label="Expo Cover Image" description="This image appears on expo discovery, visitor access, and exhibitor browse screens." value={values.coverImageUrl} onChange={(url) => setValues((v) => ({ ...v, coverImageUrl: url }))} aspectClassName="min-h-56" />
        </div>
        <Field label="Country"><select value={values.countryCode} onChange={(e) => {
          const country = countryOptions.find((item) => item.code === e.target.value)
          setValues((v) => ({ ...v, countryCode: e.target.value, organizerId: "", currencyCode: country?.defaultCurrency || v.currencyCode, timezone: country?.defaultTimezone || v.timezone }))
        }} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm">{countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.defaultCurrency})</option>)}</select></Field>
        <Field label="City"><Input required minLength={2} maxLength={80} placeholder="Nairobi" value={values.city} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))} /></Field>
        <Field label="Venue"><Input required minLength={2} maxLength={140} placeholder="KICC" value={values.venue} onChange={(e) => setValues((v) => ({ ...v, venue: e.target.value }))} /></Field>
        <Field label="Timezone"><select required value={values.timezone} onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none">
          <option value="" disabled>Select timezone</option>
          {timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
        </select></Field>
        <Field label="Start Date"><Input required type="date" placeholder="2026-06-01" value={values.startDate} onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))} /></Field>
        <Field label="End Date"><Input required type="date" placeholder="2026-06-03" value={values.endDate} onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))} /></Field>
        <Field label="Currency"><Input required readOnly aria-readonly="true" placeholder="Country currency" value={values.currencyCode} className="cursor-not-allowed bg-elevated/70 text-slate-500" /></Field>
        <Field label="Activation Fee"><Input required type="number" min="0" step="1" placeholder="5000" value={values.activationFee} onChange={(e) => setValues((v) => ({ ...v, activationFee: e.target.value }))} /></Field>
        <Field label="Ads Add-on Fee"><Input type="number" min="0" step="1" placeholder="1000" value={values.adsAddonFee} onChange={(e) => setValues((v) => ({ ...v, adsAddonFee: e.target.value }))} /></Field>
        <Field label="Organizer Commission %"><Input required type="number" min="0" max="100" step="0.01" placeholder="30" value={values.commissionRate} onChange={(e) => setValues((v) => ({ ...v, commissionRate: e.target.value }))} /></Field>
        <Field label="Lifecycle Status"><select value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ExpoStatus }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm">{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Field>
        <Field label="Categories" wide><div className="grid gap-2 sm:grid-cols-2">{categories.data.items.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-elevated px-3 py-2 text-sm"><input type="checkbox" checked={values.categoryIds.includes(category.id)} onChange={(e) => setValues((v) => ({ ...v, categoryIds: e.target.checked ? [...v.categoryIds, category.id] : v.categoryIds.filter((id) => id !== category.id) }))} />{category.name}</label>)}</div></Field>
      </div>
    </AdminFormPage>
  )
}

function OrganizerSelect({ organizers, value, currentName, onChange }: { organizers: OrganizerRecord[]; value: string; currentName?: string; onChange: (organizerId: string) => void }) {
  const hasCurrentOrganizer = organizers.some((organizer) => organizer.id === value)
  return (
    <select required value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm">
      <option value="" disabled>Select an active organizer</option>
      {value && !hasCurrentOrganizer && <option value={value}>{currentName || "Current organizer"}</option>}
      {organizers.length === 0 && <option value="" disabled>No active organizers in this country</option>}
      {organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name} - {organizer.company}</option>)}
    </select>
  )
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-2 md:col-span-2" : "space-y-2"}><label className="text-sm font-medium text-slate-600">{label}</label>{children}</div>
}

function toPayload(values: any): ExpoPayload {
  return {
    name: values.name, description: values.description, organizerId: values.organizerId, countryCode: values.countryCode, city: values.city, venue: values.venue,
    currencyCode: values.currencyCode, timezone: values.timezone, coverImageUrl: values.coverImageUrl, exhibitorActivationFeeMinor: Math.round(Number(values.activationFee || 0) * 100), adsAddonFeeMinor: Math.round(Number(values.adsAddonFee || 0) * 100),
    organizerCommissionBps: Math.round(Number(values.commissionRate || 0) * 100), status: values.status, startDate: values.startDate, endDate: values.endDate, categoryIds: values.categoryIds
  }
}
