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
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { allVisitorDocuments, findVisitorBooth, firstProductImage, productDisplayPrice } from "@/lib/visitor-expo"
import { formatCurrency } from "@/lib/utils"

type ActionDialog = "interest" | "meeting" | null

function QuickAction({
  label,
  icon: Icon,
  href,
  onClick
}: {
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  href?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="group flex min-w-[5.75rem] flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="group flex min-w-[5.75rem] flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
      {content}
    </button>
  )
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
  const [phone, setPhone] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booth = findVisitorBooth(data, exhibitorId)
  const documents = allVisitorDocuments(booth)
  const actionMutation = useMutation({
    mutationFn: () => {
      if (!booth || !dialog) throw new Error("Exhibitor not found")
      if (dialog === "meeting" && !scheduledAt) throw new Error("Choose a meeting date and time")
      return api.createVisitorExpoAction(token || "", expoId, {
        boothId: booth.id,
        action: dialog === "meeting" ? "meeting" : "interest",
        name: user?.name,
        email: user?.email,
        phone: phone.trim(),
        source: "visitor_profile",
        scheduledAt: dialog === "meeting" ? new Date(scheduledAt).toISOString() : undefined,
        notes: notes.trim() || (dialog === "meeting" ? `Meeting request for ${booth.exhibitorName}` : `Interested in ${booth.exhibitorName}`)
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
    api.createVisitorExpoAction(token, expoId, {
      boothId: booth.id,
      action: "visit",
      name: user.name,
      email: user.email,
      source: "remote_visit",
      notes: "Opened exhibitor profile."
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
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

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
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
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{booth.description || "Explore products, chat, request a meeting, download materials, and share feedback."}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-border/70 bg-elevated/55 p-5 lg:border-l lg:border-t-0">
              <h2 className="text-sm font-semibold text-foreground">Company details</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p><span className="font-semibold text-muted">Email:</span> <span className="text-foreground">{booth.email || "Not provided"}</span></p>
                <p><span className="font-semibold text-muted">Phone:</span> <span className="text-foreground">{booth.phone || "Not provided"}</span></p>
                <p><span className="font-semibold text-muted">Address:</span> <span className="text-foreground">{booth.address || "Not provided"}</span></p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3 sm:min-w-0 sm:flex-wrap">
            <QuickAction label="Chat" icon={ChatIcon} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/chat`} />
            <QuickAction label="Interested" icon={HeartIcon} onClick={() => setDialog("interest")} />
            <QuickAction label="Meeting" icon={CalendarIcon} onClick={() => setDialog("meeting")} />
            <QuickAction label="Feedback" icon={FeedbackIcon} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/feedback`} />
            <QuickAction label="Live" icon={BellIcon} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/live-stream`} />
            <QuickAction label="Files" icon={DownloadIcon} href="#downloads" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
          {booth.products.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted">Products will appear here when the exhibitor publishes them.</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {booth.products.map((product) => (
                <Link key={product.id} href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/products/${product.id}`} className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card">
                  <div className="aspect-[4/3] bg-elevated">
                    {firstProductImage(product) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstProductImage(product)} alt={product.name} className="h-full w-full object-contain p-2" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-primary">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{product.description}</p>
                    <p className="mt-3 font-mono text-sm font-semibold text-primary">{formatCurrency(productDisplayPrice(product), product.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {dialog ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="visitor-action-title" onClick={() => setDialog(null)}>
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{booth.exhibitorName}</p>
                  <h2 id="visitor-action-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    {dialog === "meeting" ? "Request a meeting" : "Share interest"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {dialog === "meeting" ? "Choose a preferred time and add any context for the exhibitor." : "Let the exhibitor know what you are interested in so they can follow up."}
                  </p>
                </div>
                <button type="button" onClick={() => setDialog(null)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-muted hover:text-foreground">Close</button>
              </div>
              <div className="mt-5 grid gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="visitor-action-phone">Phone number</label>
                  <input id="visitor-action-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254 799 010 210" className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
                </div>
                {dialog === "meeting" ? (
                  <div>
                    <label className="text-sm font-semibold text-foreground" htmlFor="visitor-action-time">Preferred date and time</label>
                    <input id="visitor-action-time" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary" />
                  </div>
                ) : null}
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="visitor-action-notes">Notes</label>
                  <textarea id="visitor-action-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder={dialog === "meeting" ? "What would you like to discuss?" : "Products, services, or questions you want them to respond to"} className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
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
            <Card className="border-dashed p-8 text-center text-sm text-muted">No company or expo files are available yet.</Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {documents.map((document) => (
                <a key={`${document.scope}-${document.id}`} href={document.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/25">
                  <p className="font-semibold text-foreground">{document.name}</p>
                  <p className="mt-1 text-sm text-muted">{document.scope} file</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </SessionGuard>
  )
}
