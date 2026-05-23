"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button, buttonClasses } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { SearchIcon } from "@/components/ui/icons"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { VisitorExpo } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"

const PAGE_SIZE = 9

function ExpoCard({ expo }: { expo: VisitorExpo }) {
  const exhibitorCount = expo.booths?.length || 0
  return (
    <Card className="group overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-float">
      <div className="relative h-52 bg-elevated">
        {expo.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={expo.bannerImage} alt={expo.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.2),transparent_34%),linear-gradient(135deg,#f8f5ff,#efe7ff_56%,#f7fbfb)]">
            <span className="text-4xl font-semibold text-primary/45">{expo.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/16 to-transparent" />
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
      
      <div className="p-5">
        <h3 className="line-clamp-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{expo.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{expo.description}</p>
        
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Date</p>
            <p className="text-sm font-medium text-foreground">{formatDate(expo.startDate)}</p>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Venue</p>
            <p className="max-w-[9rem] truncate text-sm font-semibold text-primary">{expo.venue}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <Link href={`/visitor/expos/${expo.id}`} className={buttonClasses({ className: "w-full justify-center" })}>
            Open Expo
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

  const expoData = data || []
  const categories = useMemo(() => ["All", ...Array.from(new Set(expoData.map((expo) => expo.category).filter(Boolean)))], [expoData])
  const expos = useMemo(() => expoData.filter((expo) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesCategory = selectedCategory === "All" || expo.category === selectedCategory
    const matchesSearch = !query || [expo.name, expo.description, expo.venue, expo.organizerName, expo.category].some((value) => (value || "").toLowerCase().includes(query))
    return matchesCategory && matchesSearch
  }), [expoData, searchQuery, selectedCategory])
  const totalPages = Math.max(1, Math.ceil(expos.length / PAGE_SIZE))
  const pageItems = expos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedCategory])

  if (isLoading || !data) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-slate-500">Loading expos...</p>
        </div>
      </SessionGuard>
    )
  }

  if (error) return <ErrorState title="Failed to load expos" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.20),transparent_34%),radial-gradient(circle_at_92%_18%,hsl(var(--accent)/0.12),transparent_32%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.62))] p-6 shadow-card backdrop-blur-xl lg:p-8">
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-primary/10" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">Expo discovery</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Explore expos</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">Find expos that are live now or coming soon, then open exhibitors, products, chats, files, and meetings from one place.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-80">
                <div className="rounded-3xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm">
                  <p className="text-2xl font-bold text-foreground">{expoData.length.toLocaleString()}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Available</p>
                </div>
                <div className="rounded-3xl border border-primary/15 bg-primary/10 px-5 py-4 shadow-sm">
                  <p className="text-2xl font-bold text-primary">{expos.length.toLocaleString()}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">Matched</p>
                </div>
              </div>
            </div>
            <div className="relative mt-5">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                aria-label="Search expos"
                placeholder="Search expos, venue, organizer, or category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-14 w-full rounded-2xl border border-border/60 bg-card/90 py-3 pl-11 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-slate-400 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

        <div className="-mx-4 flex max-w-[100dvw] gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0" aria-label="Expo categories">
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
            <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
              {pageItems.map((expo) => (
                <ExpoCard key={expo.id} expo={expo} />
              ))}
            </div>
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 sm:flex-row">
              <p className="text-sm text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, expos.length)} of {expos.length.toLocaleString()} expos
              </p>
              <div className="flex max-w-full flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:justify-end">
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
