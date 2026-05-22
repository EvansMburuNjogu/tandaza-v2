"use client"

import { useQuery } from "@tanstack/react-query"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { VisitorFavorite } from "@/lib/api/contracts"
import Link from "next/link"

function FavoriteItem({ favorite }: { favorite: VisitorFavorite }) {
  return (
    <Card className="p-4 hover:shadow-lg transition-all">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
          {favorite.type === "expo" ? (
            <span className="text-2xl text-primary">🎪</span>
          ) : (
            <span className="text-2xl text-primary">🏢</span>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{favorite.name}</h3>
          <p className="text-sm text-muted capitalize">{favorite.type}</p>
          <p className="text-xs text-muted/80 mt-1">
            Added {new Date(favorite.addedAt).toLocaleDateString()}
          </p>
        </div>
        
        <div>
          {favorite.type === "expo" ? (
            <Link 
              href={`/visitor/expos/${favorite.itemId}`}
              className="text-sm text-primary hover:underline"
            >
              View Expo
            </Link>
          ) : (
            <span className="text-sm text-slate-400">Coming soon</span>
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
        <div>
          <h1 className="text-2xl font-bold">My Favorites</h1>
          <p className="text-slate-500">Your saved expos and exhibitors.</p>
        </div>

        {data.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-500 mb-4">You haven't saved any favorites yet.</p>
            <Link href="/visitor/expos" className="text-primary hover:underline">
              Browse expos to add favorites
            </Link>
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