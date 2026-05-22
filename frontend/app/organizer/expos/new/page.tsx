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
import { api } from "@/lib/api"
import { availableCountries, countryDefaults } from "@/lib/country-options"
import { ExpoPayload } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"

export default function OrganizerNewExpoPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.getCategories(token || ""), enabled: Boolean(token) })
  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries() })
  const profile = useQuery({ queryKey: ["organizer-profile"], queryFn: () => api.getOrganizerProfile(token || ""), enabled: Boolean(token) })
  const [values, setValues] = useState({
    name: "",
    description: "",
    countryCode: "KE",
    city: "Nairobi",
    venue: "",
    currencyCode: "KES",
    timezone: "Africa/Nairobi",
    startDate: "",
    endDate: "",
    categoryIds: [] as string[]
  })

  useEffect(() => {
    if (!countries.data?.items.length || !profile.data) return
    const organizerCountry = profile.data.countryCode || "KE"
    const defaults = countryDefaults(countries.data.items, organizerCountry)
    setValues((current) => ({ ...current, ...defaults, countryCode: organizerCountry }))
  }, [countries.data?.items, profile.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateOrganizerExpo(values)) return
    try {
      const expo = await api.createOrganizerExpo(token || "", toPayload(values))
      toast.success("Expo draft created")
      router.push(`/organizer/expos/${expo.id}`)
    } catch (error) {
      toast.error("Could not create expo", { description: error instanceof Error ? error.message : "Try again." })
    }
  }

  if (categories.isError || profile.isError) return <ErrorState onRetry={() => { categories.refetch(); profile.refetch() }} />
  if (countries.isError) return <ErrorState onRetry={() => countries.refetch()} />
  if (categories.isLoading || countries.isLoading || profile.isLoading || !categories.data || !countries.data || !profile.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const activeCategories = categories.data.items.filter((category) => category.active)
  const selectedCountry = availableCountries(countries.data.items).find((country) => country.code === values.countryCode)

  return (
    <AdminFormPage title="Create Expo Draft" description="Create your expo draft. Tandaza pricing and commission are finalized by the platform administrator." backHref="/organizer/expos" submitLabel="Create Draft" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Expo Name"><Input required minLength={3} maxLength={140} placeholder="Nairobi Tech Expo" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></Field>
        <Field label="Market"><div className="h-12 rounded-xl border border-border/80 bg-elevated px-4 py-3 text-sm text-slate-600">{selectedCountry?.name || values.countryCode} · {values.currencyCode}</div></Field>
        <Field label="Description" wide><Textarea required minLength={10} maxLength={800} rows={3} placeholder="Describe the expo, audience, sectors, and remote access value." value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></Field>
        <Field label="City"><Input required minLength={2} maxLength={80} placeholder="Nairobi" value={values.city} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))} /></Field>
        <Field label="Venue"><Input required minLength={2} maxLength={140} placeholder="KICC" value={values.venue} onChange={(e) => setValues((v) => ({ ...v, venue: e.target.value }))} /></Field>
        <Field label="Timezone"><Input required pattern="[A-Za-z_]+/[A-Za-z_]+(/[A-Za-z_]+)?" title="Use an IANA timezone such as Africa/Nairobi" placeholder="Africa/Nairobi" value={values.timezone} onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))} /></Field>
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

function validateOrganizerExpo(values: {
  name: string
  description: string
  city: string
  venue: string
  countryCode: string
  currencyCode: string
  timezone: string
  startDate: string
  endDate: string
}) {
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
