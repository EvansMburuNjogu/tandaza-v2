"use client"

import { FormEvent, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { validateCountryInput } from "@/lib/admin-validation"
import { CountryPayload, CountryRecord } from "@/lib/api/contracts"
import { timezoneOptions } from "@/lib/timezones"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"

type CountryRow = CountryRecord & { id: string }

export default function CountriesPage() {
  const token = useSessionStore((state) => state.token)
  const queryClient = useQueryClient()
  const setSelectedCountry = useAdminCountryStore((state) => state.setSelectedCountry)
  const [values, setValues] = useState<CountryPayload>({
    code: "",
    name: "",
    defaultCurrency: "",
    defaultTimezone: "",
    paymentMethods: ["paystack", "manual"]
  })
  const query = useQuery({
    queryKey: ["admin-global-countries"],
    queryFn: () => api.getAdminCountries(token || ""),
    enabled: Boolean(token)
  })
  const mutation = useMutation({
    mutationFn: (payload: CountryPayload) => api.createAdminCountry(token || "", payload),
    onSuccess: async (country) => {
      toast.success("Country created")
      setValues({ code: "", name: "", defaultCurrency: "", defaultTimezone: "", paymentMethods: ["paystack", "manual"] })
      setSelectedCountry(country.code)
      queryClient.setQueryData(["platform-countries"], (current: { items?: CountryRecord[] } | undefined) => {
        const items = current?.items || []
        const nextItems = items.some((item) => item.code === country.code)
          ? items.map((item) => item.code === country.code ? country : item)
          : [...items, country].sort((a, b) => a.name.localeCompare(b.name))
        return current ? { ...current, items: nextItems } : current
      })
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["platform-countries"] })
      ])
    },
    onError: (error) => toast.error("Could not create country", { description: error instanceof Error ? error.message : "Check the country details and try again." })
  })
  const statusMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) => api.updateAdminCountryStatus(token || "", code, active),
    onSuccess: async (country) => {
      toast.success(country.active ? "Country enabled" : "Country disabled")
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["platform-countries"] })
      ])
    },
    onError: (error) => toast.error("Could not update country", { description: error instanceof Error ? error.message : "Try again or check your permissions." })
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateCountryInput(values)) return
    mutation.mutate({
      ...values,
      code: values.code.toUpperCase(),
      defaultCurrency: values.defaultCurrency.toUpperCase()
    })
  }

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const rows: CountryRow[] = query.data.items.map((item) => ({ ...item, id: item.code }))
  const timezones = timezoneOptions()

  return (
    <div className="space-y-6">
      <PageHeader title="Countries" description="Onboard countries with their default currency, timezone, and market availability." />

      <Card className="border-border/80 bg-card p-5">
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[100px_1fr_140px_1.2fr_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Code</label>
            <Input required minLength={2} maxLength={2} pattern="[A-Z]{2}" title="Use a 2-letter country code" placeholder="UG" value={values.code} onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Name</label>
            <Input required minLength={2} maxLength={80} placeholder="Uganda" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Currency</label>
            <Input required minLength={3} maxLength={3} pattern="[A-Z]{3}" title="Use a 3-letter currency code" placeholder="UGX" value={values.defaultCurrency} onChange={(event) => setValues((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Timezone</label>
            <select
              required
              value={values.defaultTimezone}
              onChange={(event) => setValues((current) => ({ ...current, defaultTimezone: event.target.value }))}
              className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"
            >
              <option value="">Select timezone</option>
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={mutation.isPending} className="h-12 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {mutation.isPending ? "Adding..." : "Add Country"}
          </button>
        </form>
      </Card>

      <ResourcePage<CountryRow>
        title="Country Markets"
        description="Countries define market defaults used by country-scoped admin screens."
        stats={[
          { id: "total", label: "Countries", value: String(query.data.items.length), delta: "active markets", trend: "up" },
          { id: "currencies", label: "Currencies", value: String(new Set(query.data.items.map((item) => item.defaultCurrency)).size), delta: "default currencies", trend: "neutral" }
        ]}
        rows={rows}
        exportFileName="countries.csv"
        searchPlaceholder="Search countries..."
        searchText={(row) => `${row.code} ${row.name} ${row.defaultCurrency} ${row.defaultTimezone} ${row.active ? "active" : "disabled"}`}
        emptyTitle="No countries found"
        emptyDescription="Add the first country to start market onboarding."
        columns={[
          { key: "code", header: "Code", sortable: true, exportValue: (row) => row.code, render: (row) => <span className="font-mono text-sm font-semibold text-foreground">{row.code}</span> },
          { key: "name", header: "Country", sortable: true, exportValue: (row) => row.name, render: (row) => <span className="font-medium text-foreground">{row.name}</span> },
          { key: "defaultCurrency", header: "Currency", sortable: true, exportValue: (row) => row.defaultCurrency, render: (row) => <span className="text-sm text-slate-500">{row.defaultCurrency}</span> },
          { key: "defaultTimezone", header: "Timezone", sortable: true, exportValue: (row) => row.defaultTimezone, render: (row) => <span className="text-sm text-slate-500">{row.defaultTimezone}</span> },
          { key: "active", header: "Status", sortable: true, exportValue: (row) => row.active ? "Active" : "Disabled", render: (row) => <StatusBadge value={row.active ? "active" : "disabled"} /> },
          {
            key: "actions",
            header: "Actions",
            exportValue: (row) => row.active ? "Disable" : "Enable",
            render: (row) => (
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ code: row.code, active: !row.active })}
                className="rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {row.active ? "Disable" : "Enable"}
              </button>
            )
          }
        ]}
      />
    </div>
  )
}
