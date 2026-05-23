"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

function ActivityIcon({ type }: { type: string }) {
  const styles: Record<string, string> = {
    visited: "bg-primary/10 text-primary",
    saved: "bg-success/10 text-success",
    contact: "bg-purple-500/10 text-purple-500",
    feedback: "bg-amber-500/10 text-amber-600",
    preorder: "bg-blue-500/10 text-blue-500"
  }
  const icons: Record<string, string> = {
    visited: "V",
    saved: "S",
    contact: "C",
    feedback: "F",
    preorder: "P"
  }
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${styles[type] || styles.visited}`}>
      {icons[type] || "?"}
    </div>
  )
}

function UpcomingExpoCard({ expo }: { expo: { id: string; expoName: string; expoDate: string; venue: string; status: string } }) {
  return (
    <Link href={`/visitor/expos/${expo.id}`} className="block min-w-0 max-w-full rounded-2xl border border-border/70 bg-elevated p-4 transition hover:border-primary/25 hover:bg-elevated/80 focus:outline-none focus:ring-4 focus:ring-primary/10">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0 max-w-full">
          <p className="truncate font-semibold text-foreground">{expo.expoName}</p>
          <p className="mt-1 text-sm text-muted">{new Date(expo.expoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          {expo.venue ? <p className="mt-1 truncate text-xs text-muted">{expo.venue}</p> : null}
        </div>
        <span className={`inline-flex w-fit max-w-full rounded-full px-2.5 py-0.5 text-xs font-semibold ${expo.status === "upcoming" ? "bg-success/10 text-success ring-1 ring-success/20" : "bg-muted/10 text-muted ring-1 ring-border"}`}>
          {expo.status}
        </span>
      </div>
    </Link>
  )
}

export default function VisitorDashboardPage() {
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-dashboard"],
    queryFn: () => api.getVisitorDashboard(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
         <Spinner className="h-8 w-8 text-primary" />
         <p className="text-sm font-medium text-muted">Loading dashboard…</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load dashboard" />

  const stats = data!
  const upcomingExpos = stats.upcomingExpos || []
  const recentActivity = stats.recentActivity || []

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Visitor account</h1>
              <p className="mt-2 text-sm text-muted">Find expos, open exhibitors, and manage meetings.</p>
            </div>
            <Link href="/visitor/expos">
              <Button>Explore expos</Button>
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              ["Upcoming", stats.upcomingExposCount],
              ["Visits", stats.totalVisits],
              ["Saved", stats.favoritesCount]
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl bg-elevated px-2.5 py-3 text-center sm:px-4 sm:text-left">
                <p className="truncate text-[11px] font-medium text-muted sm:text-xs">{label}</p>
                <p className="mt-1 truncate text-lg font-semibold text-foreground sm:text-xl">{Number(value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Card className="min-w-0 p-5 sm:p-6">
               <div className="mb-4 flex items-center justify-between gap-3">
                 <h2 className="text-lg font-semibold text-foreground">Upcoming expos</h2>
                 <Link href="/visitor/calendar" className="text-sm font-semibold text-primary hover:underline">Calendar</Link>
              </div>
              <div className="min-w-0 space-y-3">
                {upcomingExpos.slice(0, 4).map((expo) => (
                  <UpcomingExpoCard key={expo.id} expo={expo} />
                ))}
                {upcomingExpos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No upcoming expos</p>
                    <Link href="/visitor/expos" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">Browse expos</Link>
                  </div>
                ) : null}
              </div>
          </Card>

          <Card className="min-w-0 p-5 sm:p-6">
               <div className="mb-4 flex items-center justify-between gap-3">
                 <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
                 <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted">{recentActivity.length.toLocaleString()}</span>
               </div>
              <div className="min-w-0 space-y-3">
                 {recentActivity.slice(0, 5).map((activity) => (
                   <div key={activity.id} className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border/60 bg-elevated p-3 sm:flex sm:items-center">
                     <ActivityIcon type={activity.type} />
                     <div className="flex-1 min-w-0">
                       <p className="font-medium truncate text-foreground">{activity.title}</p>
                       <p className="text-sm text-muted truncate">{activity.description}</p>
                       <p className="mt-1 text-xs text-muted/80 sm:hidden">
                         {new Date(activity.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                       </p>
                     </div>
                      <span className="hidden shrink-0 text-xs text-muted/80 sm:inline">
                       {new Date(activity.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                     </span>
                   </div>
                 ))}
                 {recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No activity yet</p>
                  </div>
                 ) : null}
              </div>
          </Card>
        </div>
      </div>
    </SessionGuard>
  )
}
