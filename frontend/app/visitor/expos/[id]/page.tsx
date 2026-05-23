"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { formatDate } from "@/lib/utils"

function expoTimeline(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return []
  const days = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setHours(0, 0, 0, 0)
  while (cursor <= last && days.length < 14) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export default function VisitorExpoDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const expoId = params.id as string
  const exhibitorFromQr = searchParams.get("exhibitor") || ""
  const sessionReady = Boolean(token && user?.role === "visitor")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booths = data?.booths || []
  const ads = data?.ads || []
  const timeline = data ? expoTimeline(data.startDate, data.endDate) : []

  useEffect(() => {
    if (!sessionReady || !expoId || !token || !user || !booths.length) return
    const booth = booths.find((item) => item.id === exhibitorFromQr || item.exhibitorId === exhibitorFromQr) || booths[0]
    if (!booth) return
    const visitKey = `tandaza_visitor_exhibit_visit_${expoId}_${booth.id}_${user.id || user.email || "visitor"}`
    if (window.sessionStorage.getItem(visitKey)) return
    window.sessionStorage.setItem(visitKey, "1")
    api.createVisitorExpoAction(token, expoId, {
      boothId: booth.id,
      action: "visit",
      name: user.name,
      email: user.email,
      source: exhibitorFromQr ? "booth_qr" : "remote_visit",
      notes: exhibitorFromQr ? "Opened exhibitor profile from QR code." : "Opened expo profile remotely."
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
    }).catch(() => {
      window.sessionStorage.removeItem(visitKey)
    })
  }, [booths, exhibitorFromQr, expoId, queryClient, sessionReady, token, user])

  if (!sessionReady) {
    return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  }

  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading expo...</p>
        </div>
      </SessionGuard>
    )
  }

  if (error || !data) return <ErrorState title="Failed to load expo details" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),linear-gradient(135deg,#ffffff,#faf8ff_62%,#f8fafc)] shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="p-5 sm:p-6">
              <Link href="/visitor/expos" className="text-sm font-semibold text-primary hover:underline">Back to expos</Link>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{data.category}</span>
                <span className="rounded-full bg-white/75 px-3 py-1">{formatDate(data.startDate)} - {formatDate(data.endDate)}</span>
                <span className="rounded-full bg-white/75 px-3 py-1">{data.venue}</span>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground lg:text-[2rem]">{data.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{data.description}</p>
              <div className="mt-5 grid gap-2 sm:max-w-[12rem]">
                <div className="rounded-2xl bg-white/75 px-4 py-3 shadow-sm ring-1 ring-white/80">
                  <p className="text-xs font-medium text-muted">Exhibitors</p>
                  <p className="mt-1 text-xl font-semibold text-primary">{booths.length.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="min-h-56 bg-elevated">
              {data.bannerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.bannerImage} alt={data.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-56 items-center justify-center bg-[linear-gradient(135deg,#f6f2ff,#ffffff)] px-8 text-center">
                  <p className="text-lg font-semibold text-foreground">Remote expo access</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {ads.length ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Featured ads</h2>
                <p className="text-sm text-muted">Paid exhibitor placements for this expo.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ads.map((ad) => {
                const linkedBooth = booths.find((booth) => booth.exhibitorId === ad.sponsorId)
                return (
                  <Link
                    key={ad.id}
                    href={linkedBooth ? `/visitor/expos/${expoId}/exhibitors/${linkedBooth.id}` : `/visitor/expos/${expoId}`}
                    className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card"
                  >
                    <div className="aspect-[16/7] bg-elevated">
                      {ad.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.mediaUrl} alt={ad.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Sponsored</p>
                      <h3 className="mt-2 line-clamp-2 font-semibold text-foreground group-hover:text-primary">{ad.name}</h3>
                      {linkedBooth ? <p className="mt-1 text-sm text-muted">{linkedBooth.exhibitorName}</p> : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Exhibitors</h2>
          {booths.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Exhibitors will appear here when they activate.</Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {booths.map((booth) => (
                <Link
                  key={booth.id}
                  href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`}
                  className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                      {booth.exhibitorLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={booth.exhibitorLogo} alt={booth.exhibitorName} className="h-full w-full object-contain p-1.5" />
                      ) : booth.exhibitorName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground group-hover:text-primary">{booth.exhibitorName}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{booth.description || "Open profile, products, chat, meetings, and downloads."}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                    <span className="rounded-full bg-elevated px-3 py-1">{booth.products.length} products</span>
                    <span className="rounded-full bg-elevated px-3 py-1">{(booth.companyDocuments?.length || 0) + (booth.expoDocuments?.length || 0)} files</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
            <p className="text-sm text-muted">Use this to plan when to explore exhibitors and return for follow-ups.</p>
          </div>
          {timeline.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">The expo timeline will appear when dates are available.</Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {timeline.map((day, index) => (
                <Card key={day.toISOString()} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Day {index + 1}</p>
                      <h3 className="mt-1 font-semibold text-foreground">{formatDate(day.toISOString())}</h3>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {index === 0 ? "Opening" : index === timeline.length - 1 ? "Closing" : "Expo day"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Exhibitor profiles, products, downloads, meetings, feedback, and chat remain available for remote access.
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </SessionGuard>
  )
}
