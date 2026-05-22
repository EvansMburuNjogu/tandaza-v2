"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
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

function ExpoCard({ expo }: { expo: VisitorExpo }) {
  return (
    <Card className="overflow-hidden group border-border/70 bg-card/95 hover:border-primary/20 transition-all">
      <div className="h-40 bg-elevated relative">
        {expo.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={expo.bannerImage} alt={expo.name} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/5" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/90 text-white ring-1 ring-white/20">
            {expo.category}
          </span>
          {expo.booths?.length ? (
            <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {expo.booths.length} exhibitors
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 text-white">
          <p className="text-xs opacity-80">{expo.organizerName}</p>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors text-foreground">{expo.name}</h3>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{expo.description}</p>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
          <div>
            <p className="text-xs text-slate-400">Date</p>
            <p className="text-sm font-medium text-foreground">{formatDate(expo.startDate)}</p>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-slate-400">Venue</p>
            <p className="max-w-[9rem] truncate text-sm font-semibold text-primary">{expo.venue}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <Link href={`/visitor/expos/${expo.id}`}>
            <Button className="w-full">View Details</Button>
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

  const categories = ["All", ...Array.from(new Set(data.map((expo) => expo.category).filter(Boolean)))]
  const expos = data.filter((expo) => {
    const matchesCategory = selectedCategory === "All" || expo.category === selectedCategory
    const matchesSearch = expo.name.toLowerCase().includes(searchQuery.toLowerCase()) || expo.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[1.75rem]">Explore Expos</h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">Discover expos, exhibitors, products, and remote access opportunities.</p>
          </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search expos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm text-foreground"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-elevated text-slate-500 hover:bg-elevated/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {expos.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-500">No expos found matching your criteria.</p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {expos.map((expo) => (
              <ExpoCard key={expo.id} expo={expo} />
            ))}
          </div>
        )}
      </div>
    </SessionGuard>
  )
}
