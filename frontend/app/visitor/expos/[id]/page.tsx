"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { ArrowRightIcon, SearchIcon, StarIcon } from "@/components/ui/icons"
import { api } from "@/lib/api"
import { SponsorAd, VisitorActivityItem, VisitorBooth } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

const EXHIBITOR_PAGE_SIZE = 9

function activityLabel(type: VisitorActivityItem["type"]) {
  const labels: Record<string, string> = {
    visited: "Visited",
    saved: "Saved",
    contact: "Shared interest",
    feedback: "Feedback",
    preorder: "Pre-order",
    profile_view: "Viewed profile",
    product_view: "Viewed product",
    document_download: "Opened file",
    meeting_joined: "Joined meeting"
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

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ""
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function expoDayLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

function expoTimelineDays(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return []
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const days: Array<{ dayNumber: number; key: string; label: string }> = []
  while (current <= last && days.length < 31) {
    days.push({ dayNumber: days.length + 1, key: dateKey(current), label: expoDayLabel(current) })
    current.setDate(current.getDate() + 1)
  }
  return days
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

function shuffleAds(ads: SponsorAd[]) {
  const items = [...ads]
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = items[index]
    items[index] = items[randomIndex]
    items[randomIndex] = current
  }
  return items
}

function adIdentityKey(ads: SponsorAd[]) {
  return ads.map((ad) => ad.id).sort().join("|")
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
  const [randomizedAds, setRandomizedAds] = useState<SponsorAd[]>([])

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booths = data?.booths || []
  const ads = data?.ads || []
  const displayedAds = adIdentityKey(randomizedAds) === adIdentityKey(ads) ? randomizedAds : ads
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
  const favoritesQuery = useQuery({
    queryKey: ["visitor-favorites", token],
    queryFn: () => api.getVisitorFavorites(token || ""),
    enabled: sessionReady
  })
  const favoriteByItem = useMemo(() => {
    const map = new Map<string, string>()
    for (const favorite of favoritesQuery.data || []) {
      map.set(`${favorite.type}:${favorite.itemId}`, favorite.id)
    }
    return map
  }, [favoritesQuery.data])
  const favoriteMutation = useMutation({
    mutationFn: async ({ booth, favoriteId }: { booth: VisitorBooth; favoriteId?: string }) => {
      if (favoriteId) {
        await api.removeFavorite(token || "", favoriteId)
        return
      }
      await api.addFavorite(token || "", "exhibitor", booth.id)
    },
    onSuccess: (_, variables) => {
      toast.success(variables.favoriteId ? "Removed from favorites." : "Added to favorites.")
      queryClient.invalidateQueries({ queryKey: ["visitor-favorites"] })
      queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update favorite.")
  })
  const timeline = useMemo(() => {
    return (timelineQuery.data || [])
      .flatMap((day) => day.activities || [])
      .filter((activity) => activity.expoId === expoId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [expoId, timelineQuery.data])
  const timelineByDate = useMemo(() => {
    const grouped = new Map<string, VisitorActivityItem[]>()
    for (const activity of timeline) {
      const key = dateKey(activity.timestamp)
      if (!key) continue
      grouped.set(key, [...(grouped.get(key) || []), activity])
    }
    return grouped
  }, [timeline])

  useEffect(() => {
    if (!sessionReady || !expoId || !token || !user || !booths.length) return
    const booth = booths.find((item) => item.id === exhibitorFromQr || item.exhibitorId === exhibitorFromQr) || booths[0]
    if (!booth) return
    const visitKey = `tandaza_visitor_exhibit_visit_${expoId}_${booth.id}_${user.id || user.email || "visitor"}`
    if (window.sessionStorage.getItem(visitKey)) return
    window.sessionStorage.setItem(visitKey, "1")
    api.recordVisitorActivity(token, expoId, {
      boothId: booth.id,
      type: "profile_view",
      description: exhibitorFromQr ? "Opened exhibitor profile from QR code." : "Opened expo profile remotely."
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

  useEffect(() => {
    if (!sessionReady || !ads.length) return
    setRandomizedAds(shuffleAds(ads))
  }, [ads, sessionReady])

  useEffect(() => {
    if (!sessionReady || !displayedAds.length) return
    for (const ad of displayedAds) {
      const key = `tandaza_ad_impression_${expoId}_${ad.id}`
      if (window.sessionStorage.getItem(key)) continue
      window.sessionStorage.setItem(key, "1")
      void api.trackSponsorAd(ad.id, "impression")
    }
  }, [displayedAds, expoId, sessionReady])

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
  const expoDays = expoTimelineDays(data.startDate, data.endDate)

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

        {displayedAds.length > 0 ? (
          <section className="overflow-hidden">
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {displayedAds.map((ad) => {
                const href = adBoothHref(expoId, booths, ad)
                return (
                  <Link
                    key={ad.id}
                    href={href}
                    onClick={() => void api.trackSponsorAd(ad.id, "click")}
                    aria-label={`Open exhibitor for ${ad.name}`}
                    className="group block w-[min(92vw,728px)] flex-none snap-center overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card"
                  >
                    <div className="aspect-[728/90] bg-elevated">
                      {ad.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.mediaUrl} alt={ad.name} className="h-full w-full object-contain" />
                      ) : null}
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
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search exhibitors</span>
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={exhibitorSearch}
                onChange={(event) => setExhibitorSearch(event.target.value)}
                placeholder="Search exhibitors"
                className="h-11 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
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
                {pagedBooths.map((booth) => {
                  const favoriteId = favoriteByItem.get(`exhibitor:${booth.id}`)
                  const isFavorite = Boolean(favoriteId)
                  return (
                    <article key={booth.id} className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
                      <button
                        type="button"
                        onClick={() => favoriteMutation.mutate({ booth, favoriteId })}
                        disabled={favoriteMutation.isPending}
                        aria-label={isFavorite ? `Remove ${booth.exhibitorName} from favorites` : `Add ${booth.exhibitorName} to favorites`}
                        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition ${isFavorite ? "border-primary/20 bg-primary text-white opacity-100" : "border-border/70 bg-card/90 text-muted opacity-100 hover:border-primary/25 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"}`}
                      >
                        <StarIcon className="h-4 w-4" />
                      </button>
                      <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} className="block">
                        <div className="flex items-start gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-elevated ring-1 ring-border/70">
                            {booth.exhibitorLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={booth.exhibitorLogo} alt={booth.exhibitorName} className="h-full w-full object-contain p-2" />
                            ) : <span className="text-lg font-semibold text-primary">{booth.exhibitorName.charAt(0)}</span>}
                          </div>
                          <div className="min-w-0 pr-10">
                            <h3 className="truncate font-semibold text-foreground group-hover:text-primary">{booth.exhibitorName}</h3>
                            {booth.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{booth.description}</p> : null}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
                            <span className="rounded-full bg-elevated px-3 py-1">{booth.products.length} products</span>
                            <span className="rounded-full bg-elevated px-3 py-1">{(booth.companyDocuments?.length || 0) + (booth.expoDocuments?.length || 0)} files</span>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition group-hover:bg-primary group-hover:text-white" aria-hidden="true">
                            View
                            <ArrowRightIcon className="h-4 w-4" />
                          </span>
                        </div>
                      </Link>
                    </article>
                  )
                })}
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
            <p className="text-sm text-muted">Your activity grouped by each expo day.</p>
          </div>
          {timelineQuery.isLoading ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Loading timeline...</Card>
          ) : expoDays.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Expo day timeline will appear when the expo dates are available.</Card>
          ) : timeline.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Your activity will appear here after you open exhibitors, share interest, request meetings, or send feedback.</Card>
          ) : (
            <div className="space-y-4">
              {expoDays.map((day) => {
                const dayActivities = timelineByDate.get(day.key) || []
                return (
                  <Card key={day.key} className="overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-elevated/60 px-4 py-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Day {day.dayNumber}</p>
                        <h3 className="mt-1 text-sm font-semibold text-foreground">{day.label}</h3>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {dayActivities.length.toLocaleString()} {dayActivities.length === 1 ? "activity" : "activities"}
                      </span>
                    </div>
                    {dayActivities.length ? (
                      <div className="divide-y divide-border/70">
                        {dayActivities.map((activity) => (
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
                    ) : (
                      <div className="p-4 text-sm text-muted">No activity recorded for this expo day yet.</div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </SessionGuard>
  )
}
