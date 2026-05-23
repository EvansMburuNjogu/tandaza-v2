"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { buttonClasses } from "@/components/ui/button"
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
      <div className="space-y-6">
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
              <div className="grid grid-cols-4 gap-3">
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
                <p className="mt-2 font-mono text-2xl font-semibold text-primary">{formatCurrency(productDisplayPrice(product), product.currency)}</p>
                {product.discountedPrice && product.discountedPrice < product.price ? (
                  <p className="mt-1 font-mono text-sm text-muted line-through">{formatCurrency(product.price, product.currency)}</p>
                ) : null}
              </div>
              <div className="mt-5 grid gap-2">
                <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}/pre-order?product=${product.id}`} className={buttonClasses({ className: "w-full" })}>Make a pre-order</Link>
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
      </div>
    </SessionGuard>
  )
}
