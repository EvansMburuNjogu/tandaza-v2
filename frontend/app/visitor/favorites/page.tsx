"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { buttonClasses } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { VisitorFavorite } from "@/lib/api/contracts"

function FavoriteItem({ favorite }: { favorite: VisitorFavorite }) {
  const href = favorite.type === "expo" ? `/visitor/expos/${favorite.itemId}` : undefined

  return (
    <Card className="relative overflow-hidden transition hover:border-primary/30 hover:shadow-lg">
      <span className="absolute right-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold capitalize text-white shadow-sm">
        {favorite.type}
      </span>
      <div className="grid gap-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <div className="aspect-[16/10] bg-elevated sm:aspect-auto">
          {favorite.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favorite.image} alt={favorite.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-32 items-center justify-center bg-[linear-gradient(135deg,rgba(124,58,237,0.14),rgba(255,255,255,0.6))] text-sm font-semibold text-primary">
              {favorite.type === "expo" ? "Expo" : "Exhibitor"}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{favorite.name}</h3>
          </div>

          {href ? (
            <Link href={href} className={buttonClasses({ className: "shrink-0" })}>Open</Link>
          ) : (
            <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted">Saved</span>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function VisitorFavoritesPage() {
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-favorites"],
    queryFn: () => api.getVisitorFavorites(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-slate-500">Loading favorites...</p>
        </div>
      </SessionGuard>
    )
  }

  if (error) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <ErrorState title="Failed to load favorites" />
      </SessionGuard>
    )
  }

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
        <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),linear-gradient(135deg,#ffffff,#faf8ff_62%,#f8fafc)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">Saved</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Favorites</h1>
              <p className="mt-2 text-sm text-muted">Expos and exhibitors you want to revisit.</p>
            </div>
          </div>
        </Card>

        {data.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">T</div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">No saved items yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Browse expos and save the ones you want to revisit after scanning products, viewing materials, or chatting with exhibitors.
            </p>
            <Link href="/visitor/expos" className={buttonClasses({ className: "mt-5" })}>Browse expos</Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {data.map((favorite) => (
              <FavoriteItem key={favorite.id} favorite={favorite} />
            ))}
          </div>
        )}
      </div>
    </SessionGuard>
  )
}
