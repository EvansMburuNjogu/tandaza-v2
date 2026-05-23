"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { buttonClasses } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { allVisitorDocuments, findVisitorBooth, firstProductImage, productDisplayPrice } from "@/lib/visitor-expo"
import { formatCurrency } from "@/lib/utils"

export default function VisitorExhibitorPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const sessionReady = Boolean(token && user?.role === "visitor")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booth = findVisitorBooth(data, exhibitorId)
  const documents = allVisitorDocuments(booth)

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
              <Link href={`/visitor/expos/${expoId}`} className="text-sm font-semibold text-primary hover:underline">Back to expo</Link>
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
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{booth.description || "Explore products, request a meeting, chat, download materials, and share feedback."}</p>
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/chat`} className={buttonClasses({ variant: "secondary", className: "h-12" })}>Chat</Link>
          <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/meeting`} className={buttonClasses({ variant: "secondary", className: "h-12" })}>Request meeting</Link>
          <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/feedback`} className={buttonClasses({ variant: "secondary", className: "h-12" })}>Feedback</Link>
          <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/pre-order`} className={buttonClasses({ variant: "secondary", className: "h-12" })}>Pre-order</Link>
          <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/live-stream`} className={buttonClasses({ variant: "secondary", className: "h-12" })}>Live stream</Link>
          <a href="#downloads" className={buttonClasses({ variant: "secondary", className: "h-12" })}>Downloads</a>
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
                      <img src={firstProductImage(product)} alt={product.name} className="h-full w-full object-cover" />
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
