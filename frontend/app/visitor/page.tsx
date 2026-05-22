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

function ActionLink({ href, label, description, primary = false }: { href: string; label: string; description: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex min-h-24 flex-col justify-between rounded-2xl border p-4 transition focus:outline-none focus:ring-4 focus:ring-primary/10 ${
        primary
          ? "border-primary/25 bg-gradient-to-br from-primary to-accent text-white shadow-sm hover:shadow-md"
          : "border-border/70 bg-elevated text-foreground hover:border-primary/25 hover:bg-elevated/80"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`mt-3 text-xs leading-5 ${primary ? "text-white/75" : "text-muted"}`}>{description}</span>
    </Link>
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
  const upcomingExpos = stats.upcomingExpos || []
  const recentActivity = stats.recentActivity || []

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">Visitor workspace</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground lg:text-[1.9rem]">Find expos. Meet exhibitors. Keep the value moving.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Discover expos, open exhibitor profiles, save what matters, and manage your meetings from one clean visitor account.
              </p>
            </div>
            <Link href="/visitor/expos">
              <Button>Explore expos</Button>
            </Link>
          </div>
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
                {upcomingExpos.slice(0, 4).map((expo) => (
                  <UpcomingExpoCard key={expo.id} expo={expo} />
                ))}
                {upcomingExpos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-elevated/50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No upcoming expos yet</p>
                    <p className="mt-1 text-xs leading-5 text-muted">Explore available expos and save the ones you want to follow.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
                 <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted">{recentActivity.length.toLocaleString()} updates</span>
               </div>
              <div className="space-y-3">
                 {recentActivity.slice(0, 5).map((activity) => (
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
                 {recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-elevated/50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No activity yet</p>
                    <p className="mt-1 text-xs leading-5 text-muted">When you visit exhibitors, save profiles, or request meetings, the latest updates appear here.</p>
                  </div>
                 ) : null}
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ActionLink href="/visitor/expos" label="Explore expos" description="Browse expos and open exhibitor profiles." primary />
              <ActionLink href="/visitor/calendar" label="My calendar" description="See your meetings and reminders." />
              <ActionLink href="/visitor/favorites" label="Saved items" description="Return to expos and exhibitors you saved." />
              <ActionLink href="/visitor/settings" label="Profile" description="Update your contact details and preferences." />
            </div>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
