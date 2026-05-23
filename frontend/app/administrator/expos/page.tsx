"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { IconCalendar, IconCreditCard, IconMap } from "@/components/marketing/icons"
import { PageHeader } from "@/components/admin/page-header"
import { StatCard } from "@/components/admin/stat-card"
import { StatusBadge } from "@/components/admin/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { SearchIcon } from "@/components/ui/icons"
import { api } from "@/lib/api"
import { ExpoRecord } from "@/lib/api/contracts"
import { formatCurrency, mediaUrl, safeDisplay } from "@/lib/utils"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"

const PAGE_SIZE = 9

function formatExpoDate(value: string) {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return "Date pending"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(parsed)
}

export default function ExposPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const [queryText, setQueryText] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ["admin-expos", selectedCountry],
    queryFn: () => api.getAdminExpos(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  const rows = query.data?.items || []
  const statuses = useMemo(() => Array.from(new Set(rows.map((expo) => expo.status).filter(Boolean))).sort(), [rows])
  const filteredRows = useMemo(() => {
    const search = queryText.toLowerCase().trim()
    return rows.filter((expo) => {
      const matchesSearch = !search || `${expo.name} ${expo.location} ${expo.organizer} ${expo.countryCode || ""}`.toLowerCase().includes(search)
      const matchesStatus = status === "all" || expo.status === status
      return matchesSearch && matchesStatus
    })
  }, [queryText, rows, status])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expo Management"
        description="Create, review, and monitor expos with a visual operations view."
        actions={<Link href="/administrator/expos/new"><Button>Create Expo</Button></Link>}
      />

      {query.data.stats.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {query.data.stats.map((stat) => <StatCard key={stat.id} stat={stat} />)}
        </div>
      )}

      <Card className="border-border/60 bg-card/86 p-3 shadow-card backdrop-blur-xl">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-md">
            <span className="sr-only">Search expos</span>
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={queryText}
              onChange={(event) => { setQueryText(event.target.value); setPage(1) }}
              placeholder="Search expos by name, location, or organizer..."
              className="h-11 w-full rounded-2xl border border-border/70 bg-elevated pl-11 pr-4 text-sm text-foreground shadow-sm placeholder:text-slate-400/70 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1) }}
              className="h-11 rounded-2xl border border-border/70 bg-elevated px-4 text-sm text-foreground shadow-sm focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="all">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
            <span className="hidden rounded-2xl border border-border/70 bg-elevated px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm sm:inline-flex">
              {filteredRows.length} expo{filteredRows.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </Card>

      {visibleRows.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleRows.map((expo) => <ExpoCard key={expo.id} expo={expo} />)}
        </div>
      ) : (
        <Card className="border-border/60 bg-card/86 p-10 text-center shadow-card">
          <p className="text-base font-semibold text-foreground">No expos found</p>
          <p className="mt-2 text-sm text-slate-500">Try changing the search or status filter.</p>
        </Card>
      )}

      {filteredRows.length > PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 shadow-card sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <span className="rounded-xl bg-elevated px-3 py-2 text-sm font-semibold text-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpoCard({ expo }: { expo: ExpoRecord }) {
  const image = mediaUrl(expo.coverImageUrl || expo.coverImage)
  const [failed, setFailed] = useState(false)

  return (
    <Card className="overflow-hidden border-border/80 bg-card p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44 overflow-hidden rounded-t-lg bg-[linear-gradient(135deg,#0f172a,#0f766e)]">
        {image && !failed ? (
          <img src={image} alt={expo.name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <div className="flex h-full items-end p-5">
            <p className="max-w-[14rem] text-xl font-semibold leading-tight text-white">{expo.name}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{expo.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{expo.description || safeDisplay(expo.organizer)}</p>
          </div>
          <StatusBadge value={expo.status.replaceAll("_", " ")} />
        </div>

        <div className="grid gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-primary"><IconCalendar /></span>
            <span>{formatExpoDate(expo.startDate)} - {formatExpoDate(expo.endDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary"><IconMap /></span>
            <span className="line-clamp-1">{expo.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary"><IconCreditCard /></span>
            <span>{formatCurrency(expo.exhibitorFee, expo.currency)} one-off activation</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Organizer</p>
            <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">{safeDisplay(expo.organizer)}</p>
          </div>
          <Link href={`/administrator/expos/${expo.id}`}>
            <Button type="button" size="sm">View</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
