"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { IconCalendar, IconCreditCard, IconMap, IconSearch } from "@/components/marketing/icons"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/admin/status-badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import type { AvailableExpo } from "@/lib/api/contracts"
import { formatCurrency, mediaUrl } from "@/lib/utils"

const pageSize = 6

function formatExpoDate(value: string) {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return "Date pending"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(parsed)
}

function pageItems<T>(items: T[], page: number) {
  return items.slice((page - 1) * pageSize, page * pageSize)
}

function PaginationControls({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-slate-500">
        Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Previous</Button>
        <span className="rounded-lg bg-elevated px-3 py-2 text-xs font-semibold text-slate-500">Page {page} of {totalPages}</span>
        <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Next</Button>
      </div>
    </div>
  )
}

function ExpoCover({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const image = mediaUrl(src)
  return (
    <div className="relative h-44 overflow-hidden rounded-t-lg bg-[linear-gradient(135deg,#0f172a,#0f766e)]">
      {image && !failed ? (
        <img src={image} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full items-end p-5">
          <p className="max-w-[14rem] text-xl font-semibold leading-tight text-white">{name}</p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
    </div>
  )
}

function AvailableExpoCard({ expo, onOpen }: { expo: AvailableExpo; onOpen: () => void }) {
  const fee = expo.pricing?.baseFee || expo.boothOptions?.[0]?.price || 0
  const venue = expo.venue?.name || "Venue pending"
  const location = expo.venue?.address || venue
  return (
    <Card className="overflow-hidden border-border/80 bg-card p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <ExpoCover src={expo.coverImage || expo.bannerImage} name={expo.name} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{expo.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{expo.description}</p>
          </div>
          <StatusBadge value={expo.status} />
        </div>
        <div className="grid gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-primary"><IconCalendar /></span>
            <span>{formatExpoDate(expo.startDate)} - {formatExpoDate(expo.endDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary"><IconMap /></span>
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary"><IconCreditCard /></span>
            <span>{formatCurrency(fee, expo.currency || "KES")} one-off activation</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Available expo</span>
          <Button type="button" size="sm" onClick={onOpen}>
            View
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default function ExhibitorExposPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [browsePage, setBrowsePage] = useState(1)

  const availableQuery = useQuery({
    queryKey: ["available-expos"],
    queryFn: () => api.getAvailableExpos(token || ""),
    enabled: Boolean(token)
  })

  const isLoading = availableQuery.isLoading
  const isError = availableQuery.isError

  const availableExpos = (availableQuery.data || []).filter((expo) => {
    const activationStatus = String(expo.activationStatus || expo.status || "").toLowerCase()
    return activationStatus !== "active" && activationStatus !== "disabled"
  })

  const filteredExpos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return availableExpos
    return availableExpos.filter((expo) =>
      expo.name.toLowerCase().includes(query) ||
      expo.description.toLowerCase().includes(query) ||
      (expo.venue?.name || "").toLowerCase().includes(query) ||
      (expo.venue?.address || "").toLowerCase().includes(query)
    )
  }, [availableExpos, searchQuery])

  useEffect(() => {
    setBrowsePage(1)
  }, [searchQuery])

  useEffect(() => {
    setBrowsePage((page) => Math.min(page, Math.max(1, Math.ceil(filteredExpos.length / pageSize))))
  }, [filteredExpos.length])

  if (isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (isError) return <ErrorState onRetry={() => availableQuery.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse Expos"
        description="Explore published expos and activate the digital workspace your company needs."
      />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
            <Input
              type="text"
              placeholder="Search expos, venues, or cities"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-sm text-slate-500">{filteredExpos.length} expo{filteredExpos.length === 1 ? "" : "s"} available for activation</p>
        </div>

        {filteredExpos.length > 0 ? (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pageItems(filteredExpos, browsePage).map((expo) => (
                <AvailableExpoCard key={expo.assignmentId || expo.id} expo={expo} onOpen={() => router.push(`/exhibitor/expos/${expo.id}`)} />
              ))}
            </div>
            <PaginationControls page={browsePage} total={filteredExpos.length} onPageChange={setBrowsePage} />
          </>
        ) : (
          <Card className="border-dashed border-border/80 bg-card p-8 text-center">
            <h3 className="text-lg font-semibold text-foreground">{searchQuery ? "No matching expos found" : "No expos available for activation"}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{searchQuery ? "Try a different expo name, venue, or city." : "Activated and disabled expo workspaces do not appear here."}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
