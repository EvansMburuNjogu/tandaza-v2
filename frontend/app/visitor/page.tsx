"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { VisitorCalendarItem, VisitorExpo } from "@/lib/api/contracts"
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

function ExpoCard({ expo, tone = "upcoming" }: { expo: VisitorExpo; tone?: "live" | "upcoming" }) {
  const date = new Date(expo.startDate)
  const showImage = tone === "live"
  return (
    <Link href={`/visitor/expos/${expo.id}`} className="group block min-w-0 rounded-2xl border border-border/70 bg-elevated p-3 transition hover:border-primary/25 hover:bg-elevated/80 focus:outline-none focus:ring-4 focus:ring-primary/10">
      <div className="flex items-start gap-3">
        {showImage ? (
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-card">
            {expo.bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={expo.bannerImage} alt={expo.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-semibold text-primary">Expo</div>
            )}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3 py-1">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground group-hover:text-primary">{expo.name}</p>
            <p className="mt-1 text-sm text-muted">{Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Date pending"}</p>
            {expo.venue ? <p className="mt-1 truncate text-xs text-muted">{expo.venue}</p> : null}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone === "live" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
            {tone === "live" ? "Live" : "Soon"}
          </span>
        </div>
      </div>
    </Link>
  )
}

function MeetingCard({ meeting }: { meeting: VisitorCalendarItem }) {
  const date = new Date(`${meeting.date}T${meeting.time || "00:00"}`)
  return (
    <Link href="/visitor/calendar" className="block min-w-0 rounded-2xl border border-border/70 bg-elevated p-4 transition hover:border-primary/25 hover:bg-elevated/80 focus:outline-none focus:ring-4 focus:ring-primary/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{meeting.title || meeting.expoName}</p>
          <p className="mt-1 text-sm text-muted">{Number.isFinite(date.getTime()) ? date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : meeting.date}</p>
          {meeting.expoName ? <p className="mt-1 truncate text-xs text-muted">{meeting.expoName}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">Meeting</span>
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
  const exposQuery = useQuery({
    queryKey: ["visitor-expos-home"],
    queryFn: () => api.getVisitorExpos(token || ""),
    enabled: Boolean(token)
  })
  const calendarQuery = useQuery({
    queryKey: ["visitor-calendar-home"],
    queryFn: () => api.getVisitorCalendar(token || ""),
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
  const now = new Date()
  const allExpos = exposQuery.data || []
  const liveExpos = allExpos
    .filter((expo) => {
      const start = new Date(expo.startDate)
      const end = new Date(expo.endDate)
      return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start <= now && end >= now
    })
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
  const upcomingExpos = allExpos
    .filter((expo) => {
      const start = new Date(expo.startDate)
      return Number.isFinite(start.getTime()) && start > now
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const upcomingMeetings = (calendarQuery.data || [])
    .filter((item) => item.type === "meeting" && new Date(`${item.date}T${item.time || "00:00"}`) >= now)
    .sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`).getTime() - new Date(`${b.date}T${b.time || "00:00"}`).getTime())
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
              ["Live expos", liveExpos.length],
              ["Upcoming", upcomingExpos.length],
              ["Meetings", upcomingMeetings.length]
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
                 <h2 className="text-lg font-semibold text-foreground">Live expos</h2>
                 <Link href="/visitor/expos" className="text-sm font-semibold text-primary hover:underline">View all</Link>
              </div>
              <div className="min-w-0 space-y-3">
                {liveExpos.slice(0, 3).map((expo) => (
                  <ExpoCard key={expo.id} expo={expo} tone="live" />
                ))}
                {liveExpos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No live expos right now</p>
                    <Link href="/visitor/expos" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">Browse expos</Link>
                  </div>
                ) : null}
              </div>
          </Card>

          <Card className="min-w-0 p-5 sm:p-6">
               <div className="mb-4 flex items-center justify-between gap-3">
                 <h2 className="text-lg font-semibold text-foreground">Upcoming expos</h2>
                 <Link href="/visitor/calendar" className="text-sm font-semibold text-primary hover:underline">Calendar</Link>
              </div>
              <div className="min-w-0 space-y-3">
                {upcomingExpos.slice(0, 3).map((expo) => (
                  <ExpoCard key={expo.id} expo={expo} />
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
                 <h2 className="text-lg font-semibold text-foreground">Upcoming meetings</h2>
                 <Link href="/visitor/calendar" className="text-sm font-semibold text-primary hover:underline">Calendar</Link>
              </div>
              <div className="min-w-0 space-y-3">
                {upcomingMeetings.slice(0, 3).map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
                {upcomingMeetings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No meetings scheduled</p>
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
