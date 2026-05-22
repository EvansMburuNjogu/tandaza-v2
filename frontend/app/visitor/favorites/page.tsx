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
import { formatDate } from "@/lib/utils"

function FavoriteItem({ favorite }: { favorite: VisitorFavorite }) {
  const href = favorite.type === "expo" ? `/visitor/expos/${favorite.itemId}` : undefined

  return (
    <Card className="overflow-hidden transition hover:border-primary/30 hover:shadow-lg">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">{favorite.type}</span>
              <span className="text-xs font-medium text-muted">Saved {formatDate(favorite.addedAt)}</span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-foreground">{favorite.name}</h3>
            <p className="mt-1 text-sm text-muted">
              {favorite.type === "expo" ? "Open the expo workspace and continue exploring exhibitors." : "Saved exhibitor profile."}
            </p>
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
      <div className="space-y-6">
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Saved access</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Favorites</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Keep important expos and exhibitor profiles close so you can return to products, materials, meetings, and conversations later.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-elevated px-4 py-3">
              <p className="text-xs font-semibold uppercase text-muted">Saved items</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{data.length.toLocaleString()}</p>
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
