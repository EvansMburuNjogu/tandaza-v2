"use client"

import { ComponentType, SVGProps, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { BellIcon, CalendarIcon, ChatIcon, DownloadIcon, FeedbackIcon, HeartIcon } from "@/components/ui/icons"
import { VisitorPhoneInput, fullPhoneNumber } from "@/components/visitor/phone-input"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { allVisitorDocuments, findVisitorBooth, firstProductImage } from "@/lib/visitor-expo"
import { formatCurrency } from "@/lib/utils"

type ActionDialog = "interest" | "meeting" | null

function ProductPrice({ price, discountedPrice, currency }: { price: number; discountedPrice?: number; currency: string }) {
  const hasDiscount = Boolean(discountedPrice && discountedPrice < price)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="font-mono text-sm font-semibold text-primary">
        {formatCurrency(hasDiscount ? discountedPrice || price : price, currency)}
      </span>
      {hasDiscount ? (
        <>
          <span className="font-mono text-xs text-muted line-through">{formatCurrency(price, currency)}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Discount</span>
        </>
      ) : null}
    </div>
  )
}

function plainTextFromRichText(value?: string) {
  return (value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function QuickAction({
  label,
  icon: Icon,
  href,
  onClick,
  badge
}: {
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  href?: string
  onClick?: () => void
  badge?: number
}) {
  const content = (
    <>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
        <Icon className="h-5 w-5" />
        {badge && badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-card">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
      {content}
    </button>
  )
}

function externalHref(value?: string) {
  const cleaned = (value || "").trim()
  if (!cleaned) return ""
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`
}

function socialLabel(key: string) {
  const labels: Record<string, string> = {
    linkedin: "LinkedIn",
    twitter: "X",
    instagram: "Instagram"
  }
  return labels[key] || key
}

export default function VisitorExhibitorPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const sessionReady = Boolean(token && user?.role === "visitor")
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [callingCode, setCallingCode] = useState("+254")
  const [phone, setPhone] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booth = findVisitorBooth(data, exhibitorId)
  const conversationsQuery = useQuery({
    queryKey: ["visitor-expo-conversations", expoId],
    queryFn: () => api.getVisitorExpoConversations(token || "", expoId),
    enabled: sessionReady && Boolean(expoId && booth),
    refetchInterval: 8000
  })
  const chatUnreadCount = conversationsQuery.data
    ?.find((thread) => thread.exhibitorId === booth?.exhibitorId)
    ?.unreadCount || 0
  const documents = allVisitorDocuments(booth)
  const actionMutation = useMutation({
    mutationFn: () => {
      if (!booth || !dialog) throw new Error("Exhibitor not found")
      if (dialog === "meeting" && !scheduledAt) throw new Error("Choose a meeting date and time")
      const meetingTime = scheduledAt ? new Date(scheduledAt) : null
      const baseNotes = notes.trim()
      const visitorPhone = fullPhoneNumber(callingCode, phone)
      const actionNotes = dialog === "meeting"
        ? `${baseNotes || `Meeting request for ${booth.exhibitorName}`}${meetingTime ? `\nPreferred time: ${meetingTime.toLocaleString()}` : ""}`
        : baseNotes || `Interested in ${booth.exhibitorName}`
      return api.createVisitorExpoAction(token || "", expoId, {
        boothId: booth.id,
        action: dialog === "meeting" ? "meeting" : "interest",
        title: dialog === "meeting" ? `Meeting with ${user?.name || "visitor"}` : undefined,
        name: user?.name,
        email: user?.email,
        phone: visitorPhone,
        source: "inquiry",
        temperature: "warm",
        status: dialog === "meeting" ? "meeting_booked" : "new",
        scheduledAt: meetingTime ? meetingTime.toISOString() : undefined,
        notes: actionNotes
      })
    },
    onSuccess: () => {
      toast.success(dialog === "meeting" ? "Meeting request sent." : "Interest shared with exhibitor.")
      setDialog(null)
      setPhone("")
      setScheduledAt("")
      setNotes("")
      queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not complete action.")
  })

  useEffect(() => {
    if (!sessionReady || !token || !user || !booth) return
    const visitKey = `tandaza_visitor_exhibit_visit_${expoId}_${booth.id}_${user.id || user.email || "visitor"}`
    if (window.sessionStorage.getItem(visitKey)) return
    window.sessionStorage.setItem(visitKey, "1")
    api.recordVisitorActivity(token, expoId, {
      boothId: booth.id,
      type: "profile_view",
      description: `Opened ${booth.exhibitorName} profile.`
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["visitor-timeline"] })
    }).catch(() => {
      window.sessionStorage.removeItem(visitKey)
    })
  }, [booth, expoId, queryClient, sessionReady, token, user])

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading exhibitor...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth) return <ErrorState title="Exhibitor was not found" />
  const websiteHref = externalHref(booth.website)
  const socialLinks = Object.entries(booth.socialLinks || {})
    .map(([key, value]) => ({ key, label: socialLabel(key), href: externalHref(value) }))
    .filter((item) => item.href)

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="p-5 sm:p-6">
              <BackLink href={`/visitor/expos/${expoId}`} label="Back to expo" />
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-2xl font-semibold text-primary">
                  {booth.exhibitorLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={booth.exhibitorLogo} alt={booth.exhibitorName} className="h-full w-full object-contain p-2" />
                  ) : booth.exhibitorName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Exhibitor</p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{booth.exhibitorName}</h1>
                  {booth.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{booth.description}</p> : null}
                </div>
              </div>
            </div>
            <div className="border-t border-border/70 bg-elevated/55 p-5 lg:border-l lg:border-t-0">
              <h2 className="text-sm font-semibold text-foreground">Company details</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p><span className="font-semibold text-muted">Email:</span> <span className="text-foreground">{booth.email || "Not provided"}</span></p>
                <p><span className="font-semibold text-muted">Phone:</span> <span className="text-foreground">{booth.phone || "Not provided"}</span></p>
                <p><span className="font-semibold text-muted">Address:</span> <span className="text-foreground">{booth.address || "Not provided"}</span></p>
                {websiteHref ? (
                  <p>
                    <span className="font-semibold text-muted">Website:</span>{" "}
                    <a href={websiteHref} target="_blank" rel="noreferrer" className="break-all font-semibold text-primary hover:underline">
                      {booth.website}
                    </a>
                  </p>
                ) : null}
                {socialLinks.length ? (
                  <div>
                    <p className="font-semibold text-muted">Social links</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {socialLinks.map((item) => (
                        <a key={item.key} href={item.href} target="_blank" rel="noreferrer" className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white">
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <QuickAction label="Chat" icon={ChatIcon} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/chat`} badge={chatUnreadCount} />
            <QuickAction label="Interested" icon={HeartIcon} onClick={() => setDialog("interest")} />
            <QuickAction label="Meeting" icon={CalendarIcon} onClick={() => setDialog("meeting")} />
            <QuickAction label="Feedback" icon={FeedbackIcon} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/feedback`} />
            <QuickAction label="Live" icon={BellIcon} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/live-stream`} />
            <QuickAction label="Files" icon={DownloadIcon} href="#downloads" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
          {(booth.products || []).length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Products will appear here when the exhibitor publishes them.</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {(booth.products || []).map((product) => (
                <Link key={product.id} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/products/${product.id}`} className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
                  <div className="aspect-[16/10] bg-elevated">
                    {firstProductImage(product) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstProductImage(product)} alt={product.name} className="h-full w-full object-contain p-2" />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground group-hover:text-primary">{product.name}</h3>
                    {plainTextFromRichText(product.description) ? (
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted">{plainTextFromRichText(product.description)}</p>
                    ) : null}
                    <ProductPrice price={product.price} discountedPrice={product.discountedPrice} currency={product.currency} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {dialog ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 px-3 py-6 backdrop-blur-sm sm:px-4 sm:py-8" role="dialog" aria-modal="true" aria-labelledby="visitor-action-title" onClick={() => setDialog(null)}>
            <div className="max-h-[calc(100dvh-3rem)] w-full max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:max-w-lg" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{booth.exhibitorName}</p>
                  <h2 id="visitor-action-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {dialog === "meeting" ? "Request a meeting" : "Share interest"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {dialog === "meeting" ? "Choose a preferred time and add any context for the exhibitor." : "Let the exhibitor know what you are interested in so they can follow up."}
                  </p>
                </div>
                <button type="button" onClick={() => setDialog(null)} className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-semibold text-muted hover:text-foreground">Close</button>
              </div>
              <div className="mt-5 grid gap-4">
                <VisitorPhoneInput id="visitor-action-phone" callingCode={callingCode} phone={phone} onCallingCodeChange={setCallingCode} onPhoneChange={setPhone} />
                {dialog === "meeting" ? (
                  <div>
                    <label className="text-sm font-semibold text-foreground" htmlFor="visitor-action-time">Preferred date and time</label>
                    <input id="visitor-action-time" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 block h-12 w-full min-w-0 max-w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary" />
                  </div>
                ) : null}
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="visitor-action-notes">Notes</label>
                  <textarea id="visitor-action-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder={dialog === "meeting" ? "What would you like to discuss?" : "Products, services, or questions you want them to respond to"} className="mt-2 block w-full min-w-0 max-w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
                </div>
                <Button onClick={() => actionMutation.mutate()} disabled={actionMutation.isPending}>
                  {actionMutation.isPending ? "Sending" : dialog === "meeting" ? "Send meeting request" : "Share interest"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <section id="downloads" className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Downloads</h2>
          {documents.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">No company, exhibition, or product files are available yet.</Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { scope: "Company", title: "Company files", description: "Profile documents from the exhibitor." },
                { scope: "Exhibition", title: "Exhibition files", description: "Materials shared for this exhibition." },
                { scope: "Product", title: "Product files", description: "Product-specific brochures and presentation files." }
              ].map(({ scope, title, description }) => {
                const files = documents.filter((document) => document.scope === scope)
                if (files.length === 0) return null
                return (
                  <Card key={scope} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
                      </div>
                      <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-muted">{files.length}</span>
                    </div>
                    <div className="space-y-2">
                      {files.map((document) => (
                        <a
                          key={`${document.scope}-${document.id}`}
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            if (!token || !booth) return
                            void api.recordVisitorActivity(token, expoId, {
                              boothId: booth.id,
                              type: "document_download",
                              description: `Opened ${document.scope.toLowerCase()} file: ${document.name}`
                            })
                          }}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-elevated/45 p-3 transition hover:border-primary/25 hover:bg-elevated"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{document.name}</p>
                            <p className="mt-0.5 text-xs text-muted">View or download</p>
                          </div>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <DownloadIcon className="h-4 w-4" />
                          </span>
                        </a>
                      ))}
                    </div>
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
