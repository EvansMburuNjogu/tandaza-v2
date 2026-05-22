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
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted">Your scheduled expos, meetings, and reminders.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-slate-500 hover:text-foreground transition-colors">
                  &larr;
                </button>
                <h2 className="text-lg font-semibold">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-slate-500 hover:text-foreground transition-colors">
                  &rarr;
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
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
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all text-sm
                        ${isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : ""}
                        ${isToday && !isSelected ? "bg-primary/10 text-primary font-bold" : ""}
                        ${!isSelected && !isToday ? "hover:bg-elevated" : ""}
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
            </div>
          </Card>

          {/* Expos Panel */}
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-12 -mt-12" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-1">
                {selectedDate
                  ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                  : "All Expos"}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-slate-400 hover:text-foreground mb-4 block"
                >
                  Show all expos
                </button>
              )}

              <div className="space-y-3 mt-4">
                {(selectedExpos.length > 0 ? selectedExpos : expos.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())).map((expo) => (
                  <div key={expo.id} className={`p-3 rounded-xl border ${typeColor(expo.type)}`}>
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
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No expos on this date</p>
                </div>
              )}

              {expos.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No upcoming expos</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </SessionGuard>
  )
}