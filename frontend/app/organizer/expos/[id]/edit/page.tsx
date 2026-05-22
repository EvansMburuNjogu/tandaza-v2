"use client"

import { FormEvent, ReactNode, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ErrorState } from "@/components/ui/error-state"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { ExpoPayload } from "@/lib/api/contracts"
import { availableCountries } from "@/lib/country-options"
import { useSessionStore } from "@/store/session-store"

export default function OrganizerEditExpoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const expo = useQuery({
    queryKey: ["organizer-expo", params.id],
    queryFn: () => api.getOrganizerExpo(token || "", params.id),
    enabled: Boolean(token && params.id)
  })
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.getCategories(token || ""), enabled: Boolean(token) })
  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries() })
  const [values, setValues] = useState({
    name: "",
    description: "",
    countryCode: "KE",
    city: "",
    venue: "",
    currencyCode: "KES",
    timezone: "Africa/Nairobi",
    startDate: "",
    endDate: "",
    categoryIds: [] as string[]
  })

  useEffect(() => {
    if (!expo.data) return
    setValues({
      name: expo.data.name,
      description: expo.data.description || "",
      countryCode: expo.data.countryCode || "KE",
      city: expo.data.city || "",
      venue: expo.data.venue || expo.data.location,
      currencyCode: expo.data.currency,
      timezone: expo.data.timezone || "Africa/Nairobi",
      startDate: expo.data.startDate,
      endDate: expo.data.endDate,
      categoryIds: expo.data.categories?.map((category) => category.id) || []
    })
  }, [expo.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!expo.data) return
    if (expo.data.status !== "draft" && expo.data.status !== "needs_changes") {
      toast.error("This expo cannot be edited", { description: "Only draft or needs changes expos can be updated by the organizer." })
      return
    }
    if (!validateOrganizerExpo(values)) return
    try {
      await api.updateOrganizerExpo(token || "", params.id, toPayload(values))
      toast.success("Expo changes saved")
      router.push(`/organizer/expos/${params.id}`)
    } catch (error) {
      toast.error("Could not update expo", { description: error instanceof Error ? error.message : "Try again." })
    }
  }

  if (expo.isError) return <ErrorState onRetry={() => expo.refetch()} />
  if (categories.isError) return <ErrorState onRetry={() => categories.refetch()} />
  if (countries.isError) return <ErrorState onRetry={() => countries.refetch()} />
  if (expo.isLoading || categories.isLoading || countries.isLoading || !expo.data || !categories.data || !countries.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  if (expo.data.status !== "draft" && expo.data.status !== "needs_changes") {
    return <ErrorState title="Expo is locked" message="This expo has already been submitted or approved. Contact the administrator if changes are needed." />
  }

  const countryOptions = availableCountries(countries.data.items)
  const activeCategories = categories.data.items.filter((category) => category.active)

  return (
    <AdminFormPage title="Edit Expo Draft" description="Update your expo draft before submitting it for administrator review." backHref={`/organizer/expos/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Expo Name"><Input required minLength={3} maxLength={140} placeholder="Nairobi Tech Expo" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></Field>
        <Field label="Country"><select value={values.countryCode} onChange={(e) => {
          const country = countryOptions.find((item) => item.code === e.target.value)
          setValues((v) => ({ ...v, countryCode: e.target.value, currencyCode: country?.defaultCurrency || v.currencyCode, timezone: country?.defaultTimezone || v.timezone }))
        }} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm">{countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.defaultCurrency})</option>)}</select></Field>
        <Field label="Description" wide><Textarea required minLength={10} maxLength={800} rows={3} placeholder="Describe the expo, audience, sectors, and remote access value." value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></Field>
        <Field label="City"><Input required minLength={2} maxLength={80} placeholder="Nairobi" value={values.city} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))} /></Field>
        <Field label="Venue"><Input required minLength={2} maxLength={140} placeholder="KICC" value={values.venue} onChange={(e) => setValues((v) => ({ ...v, venue: e.target.value }))} /></Field>
        <Field label="Timezone"><Input required pattern="[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?" title="Use an IANA timezone such as Africa/Nairobi" placeholder="Africa/Nairobi" value={values.timezone} onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))} /></Field>
        <Field label="Currency"><Input required minLength={3} maxLength={3} pattern="[A-Z]{3}" title="Use a 3-letter currency code" placeholder="KES" value={values.currencyCode} onChange={(e) => setValues((v) => ({ ...v, currencyCode: e.target.value.toUpperCase() }))} /></Field>
        <Field label="Start Date"><Input required type="date" value={values.startDate} onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))} /></Field>
        <Field label="End Date"><Input required type="date" value={values.endDate} onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))} /></Field>
        <Field label="Categories" wide><div className="grid gap-2 sm:grid-cols-2">{activeCategories.map((category) => <label key={category.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-elevated px-3 py-2 text-sm"><input type="checkbox" checked={values.categoryIds.includes(category.id)} onChange={(e) => setValues((v) => ({ ...v, categoryIds: e.target.checked ? [...v.categoryIds, category.id] : v.categoryIds.filter((id) => id !== category.id) }))} />{category.name}</label>)}</div></Field>
      </div>
    </AdminFormPage>
  )
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-2 md:col-span-2" : "space-y-2"}><label className="text-sm font-medium text-slate-600">{label}</label>{children}</div>
}

function toPayload(values: any): ExpoPayload {
  return {
    name: values.name,
    description: values.description,
    countryCode: values.countryCode,
    city: values.city,
    venue: values.venue,
    currencyCode: values.currencyCode,
    timezone: values.timezone,
    exhibitorActivationFeeMinor: 0,
    organizerCommissionBps: 0,
    startDate: values.startDate,
    endDate: values.endDate,
    categoryIds: values.categoryIds
  }
}

function validateOrganizerExpo(values: { name: string; description: string; city: string; venue: string; countryCode: string; currencyCode: string; timezone: string; startDate: string; endDate: string }) {
  if (!values.name.trim() || !values.description.trim() || !values.city.trim() || !values.venue.trim()) {
    toast.error("Check expo details", { description: "Name, description, city, and venue are required." })
    return false
  }
  if (!values.countryCode || !values.currencyCode || !values.timezone) {
    toast.error("Check market details", { description: "Country, currency, and timezone are required." })
    return false
  }
  if (!values.startDate || !values.endDate || values.endDate < values.startDate) {
    toast.error("Check expo dates", { description: "End date must be the same as or after start date." })
    return false
  }
  return true
}
