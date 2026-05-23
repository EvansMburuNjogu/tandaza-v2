"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { SponsorAd, VisitorActivityItem, VisitorBooth } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { formatDate } from "@/lib/utils"

const EXHIBITOR_PAGE_SIZE = 9

function activityLabel(type: VisitorActivityItem["type"]) {
  const labels: Record<string, string> = {
    visited: "Visited",
    saved: "Saved",
    contact: "Shared interest",
    feedback: "Feedback",
    preorder: "Pre-order"
  }
  return labels[type] || type.replace(/_/g, " ")
}

function activityText(activity: VisitorActivityItem, expoName: string) {
  const raw = (activity.description || activity.title || activityLabel(activity.type)).trim()
  if (!raw) return activityLabel(activity.type)
  const escapedExpo = expoName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return raw
    .replace(new RegExp(`\\b${escapedExpo}\\b`, "gi"), "expo")
    .replace(/^viewed\s+expo$/i, "Viewed expo")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeMatch(value?: string) {
  return (value || "").trim().toLowerCase()
}

function adBoothHref(expoId: string, booths: VisitorBooth[], ad: SponsorAd) {
  const sponsorId = normalizeMatch(ad.sponsorId)
  const sponsorName = normalizeMatch(ad.sponsorName)
  const booth = booths.find((item) => {
    return normalizeMatch(item.id) === sponsorId ||
      normalizeMatch(item.exhibitorId) === sponsorId ||
      normalizeMatch(item.exhibitorName) === sponsorName
  })
  return booth ? `/visitor/expos/${expoId}/exhibitors/${booth.id}` : `/visitor/expos/${expoId}`
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
  const [exhibitorSearch, setExhibitorSearch] = useState("")
  const [exhibitorPage, setExhibitorPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booths = data?.booths || []
  const ads = data?.ads || []
  const filteredBooths = useMemo(() => {
    const query = exhibitorSearch.trim().toLowerCase()
    if (!query) return booths
    return booths.filter((booth) => {
      return booth.exhibitorName.toLowerCase().includes(query) ||
        (booth.description || "").toLowerCase().includes(query) ||
        (booth.categories || []).some((category) => category.toLowerCase().includes(query))
    })
  }, [booths, exhibitorSearch])
  const exhibitorTotalPages = Math.max(1, Math.ceil(filteredBooths.length / EXHIBITOR_PAGE_SIZE))
  const pagedBooths = filteredBooths.slice((exhibitorPage - 1) * EXHIBITOR_PAGE_SIZE, exhibitorPage * EXHIBITOR_PAGE_SIZE)
  const timelineQuery = useQuery({
    queryKey: ["visitor-timeline", token],
    queryFn: () => api.getVisitorTimeline(token || ""),
    enabled: sessionReady
  })
  const timeline = useMemo(() => {
    return (timelineQuery.data || [])
      .flatMap((day) => day.activities || [])
      .filter((activity) => activity.expoId === expoId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [expoId, timelineQuery.data])

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
      queryClient.invalidateQueries({ queryKey: ["visitor-timeline"] })
    }).catch(() => {
      window.sessionStorage.removeItem(visitKey)
    })
  }, [booths, exhibitorFromQr, expoId, queryClient, sessionReady, token, user])

  useEffect(() => {
    setExhibitorPage(1)
  }, [exhibitorSearch, booths.length])

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
      <div className="max-w-full space-y-6 overflow-hidden">
        <section className="overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),linear-gradient(135deg,#ffffff,#faf8ff_62%,#f8fafc)] shadow-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="p-5 sm:p-6">
              <BackLink href="/visitor/expos" label="Back to expos" />
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

        {ads.length > 0 ? (
          <section className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ads.map((ad) => {
                const href = adBoothHref(expoId, booths, ad)
                const linkedBooth = booths.find((booth) => href.endsWith(`/exhibitors/${booth.id}`))
                return (
                  <Link
                    key={ad.id}
                    href={href}
                    onClick={() => void api.trackSponsorAd(ad.id, "click")}
                    className="group overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
                  >
                    <div className="aspect-[16/7] bg-elevated">
                      {ad.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.mediaUrl} alt={ad.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Paid ad</p>
                      <h3 className="mt-2 line-clamp-2 font-semibold text-foreground group-hover:text-primary">{ad.name}</h3>
                      <p className="mt-1 text-sm text-muted">{linkedBooth?.exhibitorName || ad.sponsorName || "Expo exhibitor"}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        <section id="exhibitors" className="scroll-mt-24 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Exhibitors</h2>
              <p className="text-sm text-muted">{filteredBooths.length.toLocaleString()} of {booths.length.toLocaleString()} exhibitors</p>
            </div>
            <label className="w-full sm:max-w-xs">
              <span className="sr-only">Search exhibitors</span>
              <input
                value={exhibitorSearch}
                onChange={(event) => setExhibitorSearch(event.target.value)}
                placeholder="Search exhibitors"
                className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
          </div>
          {booths.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Exhibitors will appear here when they activate.</Card>
          ) : filteredBooths.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">No exhibitors match your search.</Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pagedBooths.map((booth) => (
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
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{booth.description || "Company description not provided."}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                      <span className="rounded-full bg-elevated px-3 py-1">{booth.products.length} products</span>
                      <span className="rounded-full bg-elevated px-3 py-1">{(booth.companyDocuments?.length || 0) + (booth.expoDocuments?.length || 0)} files</span>
                    </div>
                  </Link>
                ))}
              </div>
              {exhibitorTotalPages > 1 ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted">Page {exhibitorPage} of {exhibitorTotalPages}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExhibitorPage((page) => Math.max(1, page - 1))}
                      disabled={exhibitorPage === 1}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setExhibitorPage((page) => Math.min(exhibitorTotalPages, page + 1))}
                      disabled={exhibitorPage === exhibitorTotalPages}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section id="timeline" className="scroll-mt-24 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
            <p className="text-sm text-muted">Your latest activity in this expo.</p>
          </div>
          {timelineQuery.isLoading ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Loading timeline...</Card>
          ) : timeline.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Your activity will appear here after you open exhibitors, share interest, request meetings, or send feedback.</Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-border/70">
                {timeline.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-4">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{activityText(activity, data.name)}</p>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {activityLabel(activity.type)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

      </div>
    </SessionGuard>
  )
}
