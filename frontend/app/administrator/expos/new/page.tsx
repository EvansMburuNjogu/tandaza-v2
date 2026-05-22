"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { ImageUploadField } from "@/components/media/image-upload-field"
import { api } from "@/lib/api"
import { validateExpoInput } from "@/lib/admin-validation"
import { availableCountries, countryDefaults } from "@/lib/country-options"
import { timezoneOptions } from "@/lib/timezones"
import { ExpoPayload, ExpoStatus, OrganizerRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"

const statusOptions: ExpoStatus[] = ["draft", "submitted_for_review", "needs_changes", "approved", "published", "live", "completed", "archived"]

export default function NewExpoPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const initialCountry = selectedCountry === "ALL" ? "KE" : selectedCountry
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.getCategories(token || ""), enabled: Boolean(token) })
  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries() })
  const selectedCountryDefaults = countryDefaults(countries.data?.items, initialCountry)
  const selectedCountryName = availableCountries(countries.data?.items).find((country) => country.code === selectedCountryDefaults.countryCode)?.name || selectedCountryDefaults.countryCode
  const [values, setValues] = useState({
    name: "",
    description: "",
    organizerId: "",
    countryCode: initialCountry,
    city: initialCountry === "GH" ? "Accra" : initialCountry === "NG" ? "Lagos" : initialCountry === "ZA" ? "Johannesburg" : "Nairobi",
    venue: "",
    currencyCode: "KES",
    timezone: "Africa/Nairobi",
    coverImageUrl: "",
    activationFee: "5000",
    adsAddonFee: "1000",
    commissionRate: "30",
    status: "draft" as ExpoStatus,
    startDate: "",
    endDate: "",
    categoryIds: [] as string[]
  })
  const organizers = useQuery({ queryKey: ["admin-organizers", values.countryCode], queryFn: () => api.getAdminOrganizers(token || "", values.countryCode), enabled: Boolean(token && values.countryCode) })

  useEffect(() => {
    if (!countries.data?.items.length) return
    setValues((current) => ({
      ...current,
      ...selectedCountryDefaults,
      organizerId: current.countryCode === selectedCountryDefaults.countryCode ? current.organizerId : ""
    }))
  }, [countries.data?.items, selectedCountryDefaults.countryCode, selectedCountryDefaults.currencyCode, selectedCountryDefaults.timezone])

  useEffect(() => {
    const firstOrganizer = organizers.data?.items[0]
    if (!firstOrganizer) return
    setValues((current) => current.organizerId ? current : ({ ...current, organizerId: firstOrganizer.id }))
  }, [organizers.data?.items])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateExpoInput(values)) return
    try {
      const payload = toPayload(values)
      await api.createAdminExpo(token || "", payload)
      toast.success("Expo created")
      router.push("/administrator/expos")
    } catch (error) {
      toast.error("Could not create expo", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  if (categories.isLoading || countries.isLoading || organizers.isLoading || !categories.data || !countries.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (categories.isError || organizers.isError) return <ErrorState onRetry={() => { categories.refetch(); organizers.refetch() }} />
  if (countries.isError) return <ErrorState onRetry={() => countries.refetch()} />

  return (
    <AdminFormPage title="Create Expo" description="Create an expo and set Tandaza activation pricing for exhibitors." backHref="/administrator/expos" submitLabel="Create Expo" onSubmit={handleSubmit}>
      <ExpoFields token={token || ""} values={values} setValues={setValues} categories={categories.data.items} selectedCountryName={selectedCountryName} organizers={organizers.data?.items || []} admin />
    </AdminFormPage>
  )
}

function ExpoFields({ token, values, setValues, categories, selectedCountryName, organizers, admin }: { token: string; values: any; setValues: (fn: any) => void; categories: Array<{ id: string; name: string }>; selectedCountryName: string; organizers: OrganizerRecord[]; admin?: boolean }) {
  const timezones = timezoneOptions(values.timezone)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Expo Name"><Input required minLength={3} maxLength={140} placeholder="Nairobi Tech Expo" value={values.name} onChange={(e) => setValues((v: any) => ({ ...v, name: e.target.value }))} /></Field>
      <Field label="Organizer"><select required disabled={!admin || organizers.length === 0} value={values.organizerId} onChange={(e) => setValues((v: any) => ({ ...v, organizerId: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm">
        {organizers.length === 0 && <option value="">No organizers in this country</option>}
        {organizers.map((organizer) => <option key={organizer.id} value={organizer.id}>{organizer.name} - {organizer.company}</option>)}
      </select></Field>
      <Field label="Description" wide><Textarea required minLength={10} maxLength={800} rows={3} placeholder="Describe the expo, audience, sectors, and remote access value." value={values.description} onChange={(e) => setValues((v: any) => ({ ...v, description: e.target.value }))} /></Field>
      <div className="md:col-span-2">
        <ImageUploadField token={token} label="Expo Cover Image" description="This image appears on expo discovery, visitor access, and exhibitor browse screens." value={values.coverImageUrl} onChange={(url) => setValues((v: any) => ({ ...v, coverImageUrl: url }))} aspectClassName="min-h-56" />
      </div>
      <Field label="Country"><Input required readOnly placeholder="Selected admin country" value={selectedCountryName} /></Field>
      <Field label="City"><Input required minLength={2} maxLength={80} placeholder="Nairobi" value={values.city} onChange={(e) => setValues((v: any) => ({ ...v, city: e.target.value }))} /></Field>
      <Field label="Venue"><Input required minLength={2} maxLength={140} placeholder="KICC" value={values.venue} onChange={(e) => setValues((v: any) => ({ ...v, venue: e.target.value }))} /></Field>
      <Field label="Timezone"><select required value={values.timezone} onChange={(e) => setValues((v: any) => ({ ...v, timezone: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none">
        <option value="" disabled>Select timezone</option>
        {timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
      </select></Field>
      <Field label="Start Date"><Input required type="date" placeholder="2026-06-01" value={values.startDate} onChange={(e) => setValues((v: any) => ({ ...v, startDate: e.target.value }))} /></Field>
      <Field label="End Date"><Input required type="date" placeholder="2026-06-03" value={values.endDate} onChange={(e) => setValues((v: any) => ({ ...v, endDate: e.target.value }))} /></Field>
      <Field label="Currency"><Input required readOnly aria-readonly="true" placeholder="Country currency" value={values.currencyCode} className="cursor-not-allowed bg-elevated/70 text-slate-500" /></Field>
      <Field label="Activation Fee"><Input required disabled={!admin} type="number" min="0" step="1" placeholder="5000" value={values.activationFee} onChange={(e) => setValues((v: any) => ({ ...v, activationFee: e.target.value }))} /></Field>
      <Field label="Ads Add-on Fee"><Input disabled={!admin} type="number" min="0" step="1" placeholder="1000" value={values.adsAddonFee} onChange={(e) => setValues((v: any) => ({ ...v, adsAddonFee: e.target.value }))} /></Field>
      <Field label="Organizer Commission %"><Input required disabled={!admin} type="number" min="0" max="100" step="0.01" placeholder="30" value={values.commissionRate} onChange={(e) => setValues((v: any) => ({ ...v, commissionRate: e.target.value }))} /></Field>
      <Field label="Lifecycle Status"><select disabled={!admin} value={values.status} onChange={(e) => setValues((v: any) => ({ ...v, status: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm">{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Field>
      <Field label="Categories" wide><div className="grid gap-2 sm:grid-cols-2">{categories.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-elevated px-3 py-2 text-sm"><input type="checkbox" checked={values.categoryIds.includes(category.id)} onChange={(e) => setValues((v: any) => ({ ...v, categoryIds: e.target.checked ? [...v.categoryIds, category.id] : v.categoryIds.filter((id: string) => id !== category.id) }))} />{category.name}</label>)}</div></Field>
    </div>
  )
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-2 md:col-span-2" : "space-y-2"}><label className="text-sm font-medium text-slate-600">{label}</label>{children}</div>
}

function toPayload(values: any): ExpoPayload {
  return {
    name: values.name,
    description: values.description,
    organizerId: values.organizerId,
    countryCode: values.countryCode,
    city: values.city,
    venue: values.venue,
    currencyCode: values.currencyCode,
    timezone: values.timezone,
    coverImageUrl: values.coverImageUrl,
    exhibitorActivationFeeMinor: Math.round(Number(values.activationFee || 0) * 100),
    adsAddonFeeMinor: Math.round(Number(values.adsAddonFee || 0) * 100),
    organizerCommissionBps: Math.round(Number(values.commissionRate || 0) * 100),
    status: values.status,
    startDate: values.startDate,
    endDate: values.endDate,
    categoryIds: values.categoryIds
  }
}
