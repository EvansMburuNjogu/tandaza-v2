"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

function ActivityIcon({ type }: { type: string }) {
  const styles: Record<string, string> = {
    visited: "bg-primary/10 text-primary",
    saved: "bg-success/10 text-success",
    contact: "bg-accent/10 text-accent",
    feedback: "bg-warning/10 text-warning",
    preorder: "bg-primary/10 text-primary"
  }
  const icons: Record<string, string> = {
    visited: "V",
    saved: "S",
    contact: "C",
    feedback: "F",
    preorder: "P"
  }
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${styles[type] || styles.visited}`}>
      {icons[type] || "?"}
    </div>
  )
}

function ActivityItem({ activity }: { activity: { id: string; type: string; title: string; description: string; timestamp: string } }) {
  return (
    <div className="flex gap-4 p-4 bg-elevated rounded-xl hover:bg-elevated/80 transition-colors">
      <ActivityIcon type={activity.type} />
      <div className="flex-1">
        <h4 className="font-medium">{activity.title}</h4>
        <p className="text-sm text-muted mt-1">{activity.description}</p>
        <p className="text-xs text-muted/80 mt-2">
          {new Date(activity.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}

const typeFilters = [
  { id: "all", label: "All" },
  { id: "visited", label: "Visited" },
  { id: "saved", label: "Saved" },
  { id: "contact", label: "Contact" },
  { id: "feedback", label: "Feedback" },
  { id: "preorder", label: "Pre-order" }
]

export default function VisitorTimelinePage() {
  const token = useSessionStore((s) => s.token)
  const [selectedType, setSelectedType] = useState("all")
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" })

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-timeline"],
    queryFn: () => api.getVisitorTimeline(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading timeline...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load timeline" />

  let timeline = data

  // Filter by type
  if (selectedType !== "all") {
    timeline = timeline.map(day => ({
      ...day,
      activities: day.activities.filter(a => a.type === selectedType)
    })).filter(day => day.activities.length > 0)
  }

  // Filter by date range
  if (dateRange.from) {
    timeline = timeline.filter(day => day.date >= dateRange.from)
  }
  if (dateRange.to) {
    timeline = timeline.filter(day => day.date <= dateRange.to)
  }

  const totalActivities = timeline.reduce((sum, day) => sum + day.activities.length, 0)

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Timeline</h1>
          <p className="text-muted">Your activity log - visited exhibitors, actions, and interactions.</p>
        </div>

        {/* Filters */}
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
          <div className="relative space-y-4">
            <div>
               <p className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Activity Type</p>
              <div className="flex flex-wrap gap-2">
                {typeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedType(filter.id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedType === filter.id
                        ? "bg-primary text-white"
                        : "bg-elevated text-slate-500 hover:bg-elevated/80"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">From</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(r => ({ ...r, from: e.target.value }))}
                  className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">To</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(r => ({ ...r, to: e.target.value }))}
                  className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm"
                />
              </div>
              {(dateRange.from || dateRange.to || selectedType !== "all") && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setDateRange({ from: "", to: "" }); setSelectedType("all") }}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Showing {totalActivities} activities across {timeline.length} days
            </p>
          </div>
        </Card>

        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border/60 lg:left-8" />

          <div className="space-y-8">
            {timeline.map((day, dayIndex) => (
              <div key={dayIndex}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary z-10">
                    {new Date(day.date).getDate()}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-sm text-slate-500">{day.activities.length} activities</p>
                  </div>
                </div>
                <div className="ml-5 lg:ml-8 space-y-3 border-l-2 border-primary/20 pl-4 lg:pl-6">
                  {day.activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {timeline.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-slate-500">No activity recorded for the selected filters.</p>
          </Card>
        )}
      </div>
    </SessionGuard>
  )
}
