"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button, buttonClasses } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { findVisitorBooth, findVisitorProduct, firstProductImage, productDisplayPrice } from "@/lib/visitor-expo"
import { formatCurrency } from "@/lib/utils"

function embeddableVideoUrl(url: string) {
  if (!url) return ""
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${id}` : url
    }
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "")
      return id ? `https://www.youtube.com/embed/${id}` : url
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0]
      return id ? `https://player.vimeo.com/video/${id}` : url
    }
  } catch {
    return url
  }
  return url
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

export default function VisitorProductPage() {
  const params = useParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const productId = params.productId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const sessionReady = Boolean(token && user?.role === "visitor")
  const [preOrderOpen, setPreOrderOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const booth = findVisitorBooth(data, exhibitorId)
  const product = findVisitorProduct(data, exhibitorId, productId)
  const images = product ? (product.images?.length ? product.images : firstProductImage(product) ? [firstProductImage(product)] : []) : []
  const demoUrl = product?.demoVideoUrl || ""
  const embedUrl = embeddableVideoUrl(demoUrl)
  const displayPrice = product ? productDisplayPrice(product) : 0
  const hasDiscount = Boolean(product?.discountedPrice && product.discountedPrice < product.price)
  const total = displayPrice * quantity

  const preOrderMutation = useMutation({
    mutationFn: () => {
      if (!booth || !product) throw new Error("Product was not found")
      if (!phone.trim()) throw new Error("Add your phone number")
      return api.createVisitorExpoAction(token || "", expoId, {
        boothId: booth.id,
        action: "pre_order",
        name: user?.name,
        email: user?.email,
        phone: phone.trim(),
        productId: product.id,
        productName: product.name,
        productPrice: displayPrice,
        productCurrency: product.currency,
        quantity,
        notes: notes.trim() || `Pre-order interest for ${product.name}`
      })
    },
    onSuccess: () => {
      toast.success("Pre-order interest sent.")
      setPreOrderOpen(false)
      setQuantity(1)
      setPhone("")
      setNotes("")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send pre-order.")
  })

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading product...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth || !product) return <ErrorState title="Product was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
        <BackLink href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} label="Back to exhibitor" />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="aspect-[16/10] bg-elevated">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0]} alt={product.name} className="h-full w-full object-contain p-3" />
                ) : null}
              </div>
            </Card>
            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {images.slice(1, 5).map((image) => (
                  <div key={image} className="aspect-square overflow-hidden rounded-2xl border border-border/70 bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
            {demoUrl ? (
              <Card className="overflow-hidden">
                {isDirectVideo(demoUrl) ? (
                  <video src={demoUrl} controls className="aspect-video w-full bg-black" />
                ) : (
                  <iframe src={embedUrl} title={`${product.name} demo`} className="aspect-video w-full bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                )}
              </Card>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{booth.exhibitorName}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{product.name}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">{product.description}</p>
              <div className="mt-5 rounded-2xl bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Price</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-primary">{formatCurrency(displayPrice, product.currency)}</p>
                {hasDiscount ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm text-muted line-through">{formatCurrency(product.price, product.currency)}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Discounted</span>
                  </div>
                ) : null}
              </div>
              <div className="mt-5 grid gap-2">
                <Button onClick={() => setPreOrderOpen(true)} className="w-full">Make a pre-order</Button>
                <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/chat`} className={buttonClasses({ variant: "secondary", className: "w-full" })}>Ask about product</Link>
              </div>
            </Card>

            {(product.specifications || product.presentationUrl) ? (
              <Card className="p-5">
                <h2 className="font-semibold text-foreground">Details</h2>
                {product.specifications ? <div className="prose prose-sm mt-3 max-w-none text-muted" dangerouslySetInnerHTML={{ __html: product.specifications }} /> : null}
                {product.presentationUrl ? (
                  <a href={product.presentationUrl} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "outline", className: "mt-4 w-full" })}>Download material</a>
                ) : null}
              </Card>
            ) : null}
          </aside>
        </section>

        {preOrderOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="preorder-title" onClick={() => setPreOrderOpen(false)}>
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pre-order</p>
                  <h2 id="preorder-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{product.name}</h2>
                  <p className="mt-2 text-sm text-muted">{booth.exhibitorName}</p>
                </div>
                <button type="button" onClick={() => setPreOrderOpen(false)} className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-muted hover:text-foreground">Close</button>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Unit price</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-primary">{formatCurrency(displayPrice, product.currency)}</p>
                    </div>
                    <div className="flex items-center rounded-full border border-border bg-card p-1">
                      <button type="button" aria-label="Reduce quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-foreground hover:bg-elevated">-</button>
                      <span className="min-w-10 text-center text-sm font-semibold text-foreground">{quantity}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-foreground hover:bg-elevated">+</button>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border/70 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Estimated total</p>
                    <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{formatCurrency(total, product.currency)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="preorder-phone">Phone number</label>
                  <input id="preorder-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254 799 010 210" className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground" htmlFor="preorder-notes">Notes</label>
                  <textarea id="preorder-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Delivery details, configuration, or questions" className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
                </div>
                <Button onClick={() => preOrderMutation.mutate()} disabled={preOrderMutation.isPending}>
                  {preOrderMutation.isPending ? "Sending" : "Send pre-order"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SessionGuard>
  )
}
