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

function StatCard({ label, value, color = "primary" }: { label: string; value: string | number; color?: "primary" | "success" | "amber" | "purple" }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/5 group-hover:bg-primary/10",
    success: "bg-success/5 group-hover:bg-success/10",
    amber: "bg-amber-500/5 group-hover:bg-amber-500/10",
    purple: "bg-purple-500/5 group-hover:bg-purple-500/10"
  }
  return (
    <Card className="group relative overflow-hidden border-border/70 bg-card/95 p-6 hover:border-primary/20">
      <div className={`absolute top-0 right-0 w-20 h-20 ${colors[color]} rounded-full -mr-10 -mt-10 transition-colors`} />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">{label}</p>
        <p className="mt-5 text-[2rem] font-semibold leading-none tracking-tight text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </div>
    </Card>
  )
}

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
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${styles[type] || styles.visited}`}>
      {icons[type] || "?"}
    </div>
  )
}

function UpcomingExpoCard({ expo }: { expo: { id: string; expoName: string; expoDate: string; venue: string; status: string } }) {
  return (
    <div className="flex items-center justify-between p-4 bg-elevated rounded-xl hover:bg-elevated/80 transition-colors border border-border/60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-semibold text-sm border border-border/40">
          {expo.expoName.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-foreground">{expo.expoName}</p>
          <p className="text-sm text-muted">{new Date(expo.expoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} - {expo.venue}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${expo.status === "upcoming" ? "bg-success/10 text-success ring-1 ring-success/20" : "bg-muted/10 text-muted ring-1 ring-border"}`}>
          {expo.status}
        </span>
      </div>
    </div>
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

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[1.75rem]">Welcome back!</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted">Your expo access, saved exhibitors, and recent activity.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Upcoming Expos" value={stats.upcomingExposCount} color="success" />
          <StatCard label="Total Visits" value={stats.totalVisits} color="purple" />
          <StatCard label="Favorites" value={stats.favoritesCount} color="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-foreground">Upcoming Expos</h3>
                 <Link href="/visitor/calendar" className="text-sm text-primary hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {stats.upcomingExpos.map((expo) => (
                  <UpcomingExpoCard key={expo.id} expo={expo} />
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                 <Link href="/visitor/timeline" className="text-sm text-primary hover:underline">View all</Link>
               </div>
              <div className="space-y-3">
                 {stats.recentActivity.slice(0, 3).map((activity) => (
                   <div key={activity.id} className="flex items-center gap-3 p-3 bg-elevated rounded-xl border border-border/60">
                     <ActivityIcon type={activity.type} />
                     <div className="flex-1 min-w-0">
                       <p className="font-medium truncate text-foreground">{activity.title}</p>
                       <p className="text-sm text-muted truncate">{activity.description}</p>
                     </div>
                      <span className="text-xs text-muted/80 shrink-0">
                       {new Date(activity.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                     </span>
                   </div>
                 ))}
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/visitor/expos">
                <Button>Explore Expos</Button>
              </Link>
              <Link href="/visitor/calendar">
                <Button variant="secondary">My Schedule</Button>
              </Link>
              <Link href="/visitor/favorites">
                <Button variant="secondary">Favorites</Button>
              </Link>
              <Link href="/visitor/timeline">
                <Button variant="secondary">Activity</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
