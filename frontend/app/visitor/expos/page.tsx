"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { VisitorExpo } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"

const PAGE_SIZE = 9

function ExpoCard({ expo }: { expo: VisitorExpo }) {
  const exhibitorCount = expo.booths?.length || 0
  return (
    <Card className="group overflow-hidden border-border/70 bg-card/95 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
      <div className="relative h-44 bg-elevated">
        {expo.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={expo.bannerImage} alt={expo.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.2),transparent_34%),linear-gradient(135deg,#f8f5ff,#efe7ff_56%,#f7fbfb)]">
            <span className="text-4xl font-semibold text-primary/45">{expo.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/64 via-black/8 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/90 text-white ring-1 ring-white/20">
            {expo.category || "Expo"}
          </span>
          {exhibitorCount ? (
            <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {exhibitorCount} exhibitors
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="truncate text-xs font-medium opacity-85">{expo.organizerName || "Tandaza partner"}</p>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{expo.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{expo.description}</p>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
          <div>
            <p className="text-xs text-muted">Date</p>
            <p className="text-sm font-medium text-foreground">{formatDate(expo.startDate)}</p>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-muted">Venue</p>
            <p className="max-w-[9rem] truncate text-sm font-semibold text-primary">{expo.venue}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <Link href={`/visitor/expos/${expo.id}`}>
            <Button className="w-full">Open Expo</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default function VisitorExposPage() {
  const token = useSessionStore((s) => s.token)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expos"],
    queryFn: () => api.getVisitorExpos(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading expos...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load expos" />

  const categories = useMemo(() => ["All", ...Array.from(new Set(data.map((expo) => expo.category).filter(Boolean)))], [data])
  const expos = useMemo(() => data.filter((expo) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesCategory = selectedCategory === "All" || expo.category === selectedCategory
    const matchesSearch = !query || [expo.name, expo.description, expo.venue, expo.organizerName, expo.category].some((value) => (value || "").toLowerCase().includes(query))
    return matchesCategory && matchesSearch
  }), [data, searchQuery, selectedCategory])
  const totalPages = Math.max(1, Math.ceil(expos.length / PAGE_SIZE))
  const pageItems = expos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedCategory])

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_36%),linear-gradient(135deg,#ffffff,#faf8ff_60%,#f8fafc)] p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">Expo discovery</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground lg:text-[1.9rem]">Explore expos</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Find an expo, open exhibitors, and take action quickly.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-72">
                <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-white/70">
                  <p className="text-lg font-semibold text-foreground">{data.length.toLocaleString()}</p>
                  <p className="text-xs font-medium text-muted">available</p>
                </div>
                <div className="rounded-2xl bg-primary/10 px-4 py-3 shadow-sm ring-1 ring-primary/15">
                  <p className="text-lg font-semibold text-primary">{expos.length.toLocaleString()}</p>
                  <p className="text-xs font-medium text-primary/70">matched</p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <input
                type="text"
                aria-label="Search expos"
                placeholder="Search expos, venue, organizer, or category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-12 w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-slate-400 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Expo categories">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={selectedCategory === cat}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-muted ring-1 ring-border/70 hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {expos.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <p className="font-semibold text-foreground">No expos found</p>
            <p className="mt-2 text-sm text-muted">Try another search term or clear the category filter.</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((expo) => (
                <ExpoCard key={expo.id} expo={expo} />
              ))}
            </div>
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 sm:flex-row">
              <p className="text-sm text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, expos.length)} of {expos.length.toLocaleString()} expos
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <span className="rounded-xl bg-elevated px-3 py-2 text-sm font-semibold text-foreground">Page {page} of {totalPages}</span>
                <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </SessionGuard>
  )
}
