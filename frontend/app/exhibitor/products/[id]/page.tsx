"use client"

import { FormEvent, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { StatusBadge } from "@/components/admin/status-badge"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Spinner } from "@/components/ui/spinner"
import { ProductForm, emptyProductForm, productPayloadFromForm, productToForm, validateProductForm } from "@/components/exhibitor/product-form"
import { api } from "@/lib/api"
import { formatCurrency, formatDate, mediaUrl } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import type { ProductPayload } from "@/lib/api/contracts"

type Tab = "overview" | "media" | "materials" | "edit"

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const token = useSessionStore((s) => s.token)
  const client = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [form, setForm] = useState(emptyProductForm)

  const productQuery = useQuery({
    queryKey: ["exhibitor-product", params.id],
    queryFn: () => api.getExhibitorProduct(token || "", params.id),
    enabled: Boolean(token && params.id)
  })
  const profileQuery = useQuery({
    queryKey: ["exhibitor-profile"],
    queryFn: () => api.getExhibitorProfile(token || ""),
    enabled: Boolean(token)
  })

  useEffect(() => {
    if (productQuery.data) setForm(productToForm(productQuery.data))
  }, [productQuery.data])

  useEffect(() => {
    if (searchParams.get("tab") === "edit") setActiveTab("edit")
  }, [searchParams])

  const updateMutation = useMutation({
    mutationFn: (payload: ProductPayload) => api.updateExhibitorProduct(token || "", params.id, payload),
    onSuccess: async (product) => {
      toast.success("Product updated")
      setActiveTab("overview")
      setForm(productToForm(product))
      await Promise.all([
        client.invalidateQueries({ queryKey: ["exhibitor-products"] }),
        client.invalidateQueries({ queryKey: ["exhibitor-product", params.id] })
      ])
    },
    onError: (error: Error) => toast.error(error.message || "Could not update product")
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteExhibitorProduct(token || "", params.id),
    onSuccess: async () => {
      toast.success("Product deleted")
      await client.invalidateQueries({ queryKey: ["exhibitor-products"] })
      router.push("/exhibitor/products")
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete product")
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = validateProductForm(form)
    if (message) {
      toast.error(message)
      return
    }
    updateMutation.mutate(productPayloadFromForm(form))
  }

  if (productQuery.isError) return <ErrorState onRetry={() => productQuery.refetch()} />
  if (profileQuery.isError) return <ErrorState onRetry={() => profileQuery.refetch()} />
  if (productQuery.isLoading || profileQuery.isLoading || !productQuery.data || !profileQuery.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const product = productQuery.data
  const images = product.images?.length ? product.images : product.mediaUrl ? [product.mediaUrl] : []
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "media", label: "Images" },
    { id: "materials", label: "Materials" },
    { id: "edit", label: "Edit" }
  ]

  return (
    <div className="space-y-6">
      <BackLink href="/exhibitor/products" label="Back to Products" />
      <PageHeader
        title={product.name}
        description="View product details, media, presentation material, and edit controls."
        actions={<Button variant="danger" onClick={() => { if (window.confirm("Delete this product?")) deleteMutation.mutate() }} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting..." : "Delete Product"}</Button>}
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="flex min-h-72 items-center justify-center bg-elevated p-4">
            {images[0] ? <img src={mediaUrl(images[0])} alt={product.name} className="max-h-80 w-full object-contain" /> : <div className="flex h-full min-h-72 items-center justify-center text-sm font-semibold text-slate-400">No product image</div>}
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={product.status === "available" ? "active" : product.status === "out_of_stock" ? "pending" : "inactive"} />
              {product.featured && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Featured</span>}
              <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-slate-500">{product.category}</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{product.name}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Current Price" value={formatCurrency(product.discountedPrice || product.price, product.currency)} />
              <Metric label="Original Price" value={formatCurrency(product.price, product.currency)} />
              <Metric label="Added" value={formatDate(product.createdAt)} />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto border-b border-border/80">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <RichPanel title="Description" html={product.description} empty="No description added." />
          <RichPanel title="Specifications" html={product.specifications || ""} empty="No specifications added." />
        </div>
      )}

      {activeTab === "media" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground">Product Images</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <div key={image} className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border bg-elevated p-3">
                <img src={mediaUrl(image)} alt={`${product.name} image ${index + 1}`} className="max-h-full max-w-full object-contain" />
              </div>
            ))}
            {images.length === 0 && <p className="text-sm text-slate-500">No product images uploaded.</p>}
          </div>
        </Card>
      )}

      {activeTab === "materials" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <VideoCard value={product.demoVideoUrl} />
          <MaterialCard title="Presentation Material" value={product.presentationUrl} empty="No presentation PDF uploaded." />
        </div>
      )}

      {activeTab === "edit" && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <ProductForm token={token || ""} form={form} setForm={setForm} categories={profileQuery.data.categories || []} />
            <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
              <Button type="button" variant="secondary" onClick={() => setActiveTab("overview")}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border/70 bg-elevated p-4"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p><p className="mt-2 text-sm font-semibold text-foreground">{value}</p></div>
}

function RichPanel({ title, html, empty }: { title: string; html: string; empty: string }) {
  return <Card className="p-6"><h3 className="text-lg font-semibold text-foreground">{title}</h3>{html ? <div className="prose prose-sm mt-4 max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-4 text-sm text-slate-500">{empty}</p>}</Card>
}

function MaterialCard({ title, value, empty }: { title: string; value?: string; empty: string }) {
  return <Card className="p-6"><h3 className="text-lg font-semibold text-foreground">{title}</h3>{value ? <a href={mediaUrl(value)} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border border-border bg-elevated px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/30">Open Material</a> : <p className="mt-4 text-sm text-slate-500">{empty}</p>}</Card>
}

function VideoCard({ value }: { value?: string }) {
  const source = videoSource(value)
  if (!source) {
    return <Card className="p-6"><h3 className="text-lg font-semibold text-foreground">Demo Video</h3><p className="mt-4 text-sm text-slate-500">No demo video link added.</p></Card>
  }
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground">Demo Video</h3>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-black">
        {source.type === "video" ? (
          <video src={source.url} controls className="aspect-video h-auto w-full bg-black" />
        ) : (
          <iframe src={source.url} title="Product demo video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full" />
        )}
      </div>
      <a href={source.original} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Open video link</a>
    </Card>
  )
}

function videoSource(value?: string): { type: "video" | "embed"; url: string; original: string } | null {
  const original = String(value || "").trim()
  if (!original) return null
  const url = mediaUrl(original)
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: "video", url, original: url }
  const youtube = original.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/)
  if (youtube?.[1]) return { type: "embed", url: `https://www.youtube.com/embed/${youtube[1]}`, original }
  const vimeo = original.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo?.[1]) return { type: "embed", url: `https://player.vimeo.com/video/${vimeo[1]}`, original }
  return { type: "video", url, original: url }
}
