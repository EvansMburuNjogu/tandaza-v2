"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { findVisitorBooth } from "@/lib/visitor-expo"

export default function VisitorLiveStreamPage() {
  const params = useParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const sessionReady = Boolean(token && user?.role === "visitor")
  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })
  const booth = findVisitorBooth(data, exhibitorId)

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading live stream...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth) return <ErrorState title="Live stream was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="mx-auto w-full max-w-4xl space-y-4 overflow-hidden">
        <BackLink href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} label="Back to exhibitor" />
        <Card className="overflow-hidden">
          <div className="aspect-video bg-[linear-gradient(135deg,#f6f2ff,#ffffff)]" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live stream</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">{booth.exhibitorName}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">No live stream has been published for this exhibitor yet.</p>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
