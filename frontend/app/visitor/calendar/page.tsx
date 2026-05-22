"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function typeColor(type: string) {
  const map: Record<string, string> = {
    expo: "bg-primary/20 text-primary border-primary/30",
    meeting: "bg-accent/20 text-accent border-accent/30",
    reminder: "bg-warning/20 text-warning border-warning/30"
  }
  return map[type] || map.expo
}

function typeDot(type: string) {
  const map: Record<string, string> = {
    expo: "bg-primary",
    meeting: "bg-accent",
    reminder: "bg-warning"
  }
  return map[type] || map.expo
}

export default function VisitorCalendarPage() {
  const token = useSessionStore((s) => s.token)
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-calendar"],
    queryFn: () => api.getVisitorCalendar(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading calendar...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load calendar" />

  const expos = data
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  const exposByDate: Record<string, typeof expos> = {}
  expos.forEach((e) => {
    if (!exposByDate[e.date]) exposByDate[e.date] = []
    exposByDate[e.date].push(e)
  })

  const selectedExpos = selectedDate ? exposByDate[selectedDate] || [] : []

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const grid: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_36%),linear-gradient(135deg,#ffffff,#f7f3ff_55%,#eefdfa)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">Schedule</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
              <p className="mt-2 text-sm text-muted">Expos, meetings, and reminders in one place.</p>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-3 text-white shadow-sm">
              <p className="text-lg font-semibold">{expos.length.toLocaleString()}</p>
              <p className="text-xs font-medium text-white/75">items</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="relative overflow-hidden border-primary/10 p-4 shadow-sm sm:p-6 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between rounded-2xl bg-elevated px-3 py-3">
                <button aria-label="Previous month" onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted transition-colors hover:text-foreground">
                  &larr;
                </button>
                <h2 className="text-lg font-semibold">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <button aria-label="Next month" onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted transition-colors hover:text-foreground">
                  &rarr;
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {grid.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="aspect-square" />
                  const dateStr = formatDate(currentYear, currentMonth, day)
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === selectedDate
                  const dayExpos = exposByDate[dateStr] || []
                  const hasExpos = dayExpos.length > 0

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-all
                        ${isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : ""}
                        ${isToday && !isSelected ? "bg-primary/10 font-bold text-primary ring-1 ring-primary/15" : ""}
                        ${hasExpos && !isSelected && !isToday ? "bg-accent/10 text-foreground ring-1 ring-accent/15" : ""}
                        ${!isSelected && !isToday && !hasExpos ? "hover:bg-elevated" : ""}
                      `}
                    >
                      <span>{day}</span>
                      {hasExpos && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayExpos.slice(0, 3).map((e, idx) => (
                            <div
                              key={idx}
                              className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/70" : typeDot(e.type)}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
          </Card>

          <Card className="relative overflow-hidden border-primary/10 p-5 shadow-sm sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                  : "Upcoming"}
              </h2>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="mb-4 block text-xs font-semibold text-primary hover:underline"
                >
                  Show all
                </button>
              )}

              <div className="space-y-3 mt-4">
                {(selectedExpos.length > 0 ? selectedExpos : expos.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())).map((expo) => (
                  <div key={expo.id} className={`rounded-2xl border p-3 ${typeColor(expo.type)}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${typeDot(expo.type)}`} />
                      <span className="text-xs font-semibold capitalize">{expo.type}</span>
                    </div>
                    <p className="font-medium mt-1">{expo.expoName}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {expo.time} {expo.venue && `- ${expo.venue}`}
                    </p>
                  </div>
                ))}
              </div>

              {(selectedExpos.length === 0 && selectedDate) && (
                <div className="py-8 text-center text-muted">
                  <p className="text-sm">No expos on this date</p>
                </div>
              )}

              {expos.length === 0 && (
                <div className="py-8 text-center text-muted">
                  <p className="text-sm">No upcoming expos</p>
                </div>
              )}
          </Card>
        </div>
      </div>
    </SessionGuard>
  )
}
