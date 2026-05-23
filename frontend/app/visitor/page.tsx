"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { CalendarIcon, CompassIcon, StarIcon } from "@/components/ui/icons"
import { api } from "@/lib/api"
import { VisitorCalendarItem, VisitorExpo } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"

function ActivityIcon({ type }: { type: string }) {
  const styles: Record<string, string> = {
    visited: "bg-primary/10 text-primary",
    saved: "bg-success/10 text-success",
    contact: "bg-purple-500/10 text-purple-500",
    feedback: "bg-amber-500/10 text-amber-600",
    preorder: "bg-blue-500/10 text-blue-500",
    profile_view: "bg-indigo-500/10 text-indigo-600",
    product_view: "bg-cyan-500/10 text-cyan-600",
    document_download: "bg-slate-500/10 text-slate-600",
    meeting_joined: "bg-emerald-500/10 text-emerald-600"
  }
  const icons: Record<string, string> = {
    visited: "V",
    saved: "S",
    contact: "C",
    feedback: "F",
    preorder: "P",
    profile_view: "E",
    product_view: "P",
    document_download: "D",
    meeting_joined: "M"
  }
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${styles[type] || styles.visited}`}>
      {icons[type] || "?"}
    </div>
  )
}

function greetingForNow(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function calendarItemTime(item: VisitorCalendarItem) {
  const parsed = new Date(`${item.date}T${item.time || "00:00"}`)
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0
}

function isUpcomingMeetingItem(item: VisitorCalendarItem, now: Date) {
  return item.type !== "expo" && calendarItemTime(item) >= now.getTime()
}

function ExpoCard({ expo, tone = "upcoming" }: { expo: VisitorExpo; tone?: "live" | "upcoming" }) {
  const date = new Date(expo.startDate)
  return (
    <Link href={`/visitor/expos/${expo.id}`} className="group block min-w-0 overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-primary/10">
      <div className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-0">
        <div className="relative min-h-32 overflow-hidden bg-elevated">
          {expo.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={expo.bannerImage} alt={expo.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_42%),linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--primary)/0.12))] text-3xl font-semibold text-primary/60">
              {expo.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
        </div>
        <div className="min-w-0 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone === "live" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
            {tone === "live" ? "Live" : "Soon"}
            </span>
            <span className="text-sm font-medium text-muted">{Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Date pending"}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-foreground group-hover:text-primary">{expo.name}</p>
          {expo.venue ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{expo.venue}</p> : null}
        </div>
      </div>
    </Link>
  )
}

function MeetingCard({ meeting }: { meeting: VisitorCalendarItem }) {
  const date = new Date(`${meeting.date}T${meeting.time || "00:00"}`)
  return (
    <Link href="/visitor/calendar" className="block min-w-0 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-primary/10">
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

function VisitorStatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof CompassIcon; tone: "primary" | "accent" | "soft" }) {
  const styles = {
    primary: "from-primary/16 text-primary ring-primary/15",
    accent: "from-accent/16 text-accent ring-accent/15",
    soft: "from-warning/16 text-warning ring-warning/15"
  }
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/85 p-5 shadow-card backdrop-blur-xl">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone === "primary" ? "from-primary" : tone === "accent" ? "from-accent" : "from-warning"} to-transparent`} />
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${styles[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-3xl font-bold leading-none tracking-tight text-foreground">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
    </div>
  )
}

export default function VisitorDashboardPage() {
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)

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
    .filter((item) => isUpcomingMeetingItem(item, now))
    .sort((a, b) => calendarItemTime(a) - calendarItemTime(b))
  const upcomingMeetingCount = calendarQuery.isSuccess
    ? upcomingMeetings.length
    : stats.upcomingMeetings || 0
  const recentActivity = stats.recentActivity || []
  const visitorName = user?.name?.trim() || "there"

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
        <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.20),transparent_34%),radial-gradient(circle_at_90%_20%,hsl(var(--accent)/0.13),transparent_30%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.62))] p-6 shadow-card backdrop-blur-xl lg:p-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-primary/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-end">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-primary/75">Visitor workspace</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {greetingForNow(now)}, {visitorName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Open live expos, connect with exhibitors, and keep every meeting or product interest easy to find.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/visitor/expos">
                  <Button className="w-full sm:w-auto">Explore expos</Button>
                </Link>
                <Link href="/visitor/calendar">
                  <Button variant="secondary" className="w-full sm:w-auto">View calendar</Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
              <VisitorStatCard label="Live expos" value={liveExpos.length} icon={CompassIcon} tone="primary" />
              <VisitorStatCard label="Upcoming" value={upcomingExpos.length} icon={StarIcon} tone="accent" />
              <VisitorStatCard label="Meetings" value={upcomingMeetingCount} icon={CalendarIcon} tone="soft" />
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <Card className="min-w-0 border-border/60 bg-card/85 p-5 shadow-card backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Now open</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Live expos</h2>
                </div>
                <Link href="/visitor/expos" className="text-sm font-semibold text-primary hover:underline">View all</Link>
              </div>
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
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

          <div className="grid min-w-0 gap-6">
          <Card className="min-w-0 border-border/60 bg-card/85 p-5 shadow-card backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent/75">Plan ahead</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Upcoming expos</h2>
                </div>
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

          <Card className="min-w-0 border-border/60 bg-card/85 p-5 shadow-card backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-warning/80">Your schedule</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">Upcoming meetings</h2>
                </div>
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
          </div>

          <Card className="min-w-0 border-border/60 bg-card/85 p-5 shadow-card backdrop-blur-xl sm:p-6 xl:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Latest first</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">Recent activity</h2>
                </div>
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
