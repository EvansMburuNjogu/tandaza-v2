"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { buttonClasses } from "@/components/ui/button"
import { api } from "@/lib/api"
import { VisitorCalendarItem } from "@/lib/api/contracts"
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

function itemDateTime(item: { date: string; time?: string }) {
  const time = item.time && item.time.trim() ? item.time : "00:00"
  const parsed = new Date(`${item.date}T${time}`)
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0
}

function isJoinLink(value?: string) {
  const cleaned = (value || "").trim()
  return /^https?:\/\//i.test(cleaned)
}

function formatMeetingDate(item: VisitorCalendarItem) {
  const parsed = new Date(`${item.date}T${item.time || "00:00"}`)
  if (!Number.isFinite(parsed.getTime())) return `${item.date} ${item.time}`.trim()
  return parsed.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export default function VisitorCalendarPage() {
  const token = useSessionStore((s) => s.token)
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<VisitorCalendarItem | null>(null)

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

  const items = data
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  const itemsByDate: Record<string, typeof items> = {}
  items.forEach((item) => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = []
    itemsByDate[item.date].push(item)
  })

  const selectedItems = selectedDate ? itemsByDate[selectedDate] || [] : []
  const upcomingItems = [...items]
    .filter((item) => itemDateTime(item) >= Date.now())
    .sort((a, b) => itemDateTime(a) - itemDateTime(b))
  const displayItems = selectedDate ? selectedItems : upcomingItems

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
      <div className="max-w-full space-y-6 overflow-hidden">
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_36%),linear-gradient(135deg,#ffffff,#faf8ff_60%,#f8fafc)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">Schedule</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
              <p className="mt-2 text-sm text-muted">Expos, meetings, and reminders in one place.</p>
            </div>
            <div className="rounded-2xl bg-primary/10 px-4 py-3 shadow-sm ring-1 ring-primary/15">
              <p className="text-lg font-semibold text-primary">{items.length.toLocaleString()}</p>
              <p className="text-xs font-medium text-primary/70">items</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="relative overflow-hidden border-primary/10 p-4 shadow-sm sm:p-6 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between rounded-2xl bg-elevated px-3 py-3">
                <button aria-label="Previous month" onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted transition-colors hover:text-foreground">
                  &larr;
                </button>
                <h2 className="min-w-0 truncate px-2 text-center text-base font-semibold sm:text-lg">
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
                  const dayItems = itemsByDate[dateStr] || []
                  const hasItems = dayItems.length > 0

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-all
                        ${isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : ""}
                        ${isToday && !isSelected ? "bg-primary/10 font-bold text-primary ring-1 ring-primary/15" : ""}
                        ${hasItems && !isSelected && !isToday ? "bg-accent/10 text-foreground ring-1 ring-accent/15" : ""}
                        ${!isSelected && !isToday && !hasItems ? "hover:bg-elevated" : ""}
                      `}
                    >
                      <span>{day}</span>
                      {hasItems && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayItems.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/70" : typeDot(item.type)}`}
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

              <div className="mt-4 space-y-3">
                {displayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.type === "meeting" ? setSelectedMeeting(item) : undefined}
                    className={`w-full rounded-2xl border p-3 text-left transition ${typeColor(item.type)} ${item.type === "meeting" ? "hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/15" : "cursor-default"}`}
                    aria-label={item.type === "meeting" ? `View meeting details for ${item.title || item.expoName}` : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${typeDot(item.type)}`} />
                      <span className="text-xs font-semibold capitalize">{item.type}</span>
                    </div>
                    <p className="font-medium mt-1">{item.title || item.expoName}</p>
                    {item.type === "meeting" && item.expoName && item.title !== item.expoName && (
                      <p className="mt-1 text-xs opacity-75">{item.expoName}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {item.time} {item.venue && `- ${item.venue}`}
                    </p>
                  </button>
                ))}
              </div>

              {(selectedItems.length === 0 && selectedDate) && (
                <div className="py-8 text-center text-muted">
                  <p className="text-sm">No schedule items on this date</p>
                </div>
              )}

              {!selectedDate && displayItems.length === 0 && (
                <div className="py-8 text-center text-muted">
                  <p className="text-sm">No upcoming expos or meetings</p>
                </div>
              )}
          </Card>
        </div>

        {selectedMeeting ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="visitor-meeting-title"
            onClick={() => setSelectedMeeting(null)}
          >
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">Meeting</p>
                  <h2 id="visitor-meeting-title" className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                    {selectedMeeting.title || selectedMeeting.expoName}
                  </h2>
                  {selectedMeeting.expoName && selectedMeeting.title !== selectedMeeting.expoName ? (
                    <p className="mt-1 text-sm text-muted">{selectedMeeting.expoName}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMeeting(null)}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-border/70 bg-elevated/60 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Date and time</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatMeetingDate(selectedMeeting)}</p>
                </div>
                {selectedMeeting.venue ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Meeting link</p>
                    <p className="mt-1 break-all text-sm text-foreground">{selectedMeeting.venue}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setSelectedMeeting(null)} className={buttonClasses({ variant: "secondary" })}>
                  Done
                </button>
                {isJoinLink(selectedMeeting.venue) ? (
                  <a href={selectedMeeting.venue} target="_blank" rel="noreferrer" className={buttonClasses()}>
                    Join meeting
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SessionGuard>
  )
}
