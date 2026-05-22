"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { mediaUrl } from "@/lib/utils"
import type { Product, ProductPayload } from "@/lib/api/contracts"

export type ProductFormState = {
  name: string
  description: string
  price: string
  discountedPrice: string
  currency: string
  category: string
  demoVideoUrl: string
  presentationUrl: string
  imageUrls: string[]
  specifications: string
  status: ProductPayload["status"]
  featured: boolean
}

export const emptyProductForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  discountedPrice: "",
  currency: "",
  category: "",
  demoVideoUrl: "",
  presentationUrl: "",
  imageUrls: [],
  specifications: "",
  status: "available",
  featured: false
}

export function productToForm(product: Product): ProductFormState {
  const imageUrls = product.images?.length ? product.images : product.mediaUrl ? [product.mediaUrl] : []
  return {
    name: product.name || "",
    description: product.description || "",
    price: String(product.price ?? ""),
    discountedPrice: product.discountedPrice ? String(product.discountedPrice) : "",
    currency: product.currency || "",
    category: product.category || "",
    demoVideoUrl: product.demoVideoUrl || "",
    presentationUrl: product.presentationUrl || "",
    imageUrls: imageUrls.slice(0, 5),
    specifications: product.specifications || "",
    status: product.status || "available",
    featured: Boolean(product.featured)
  }
}

export function productPayloadFromForm(form: ProductFormState): ProductPayload {
  const images = form.imageUrls.map((url) => url.trim()).filter(Boolean).slice(0, 5)
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : 0,
    currency: form.currency.trim().toUpperCase(),
    category: form.category.trim(),
    mediaType: "image",
    mediaUrl: images[0] || "",
    imageUrls: images,
    demoVideoUrl: form.demoVideoUrl.trim(),
    presentationUrl: form.presentationUrl.trim(),
    specifications: form.specifications.trim(),
    status: form.status,
    featured: form.featured
  }
}

export function validateProductForm(form: ProductFormState) {
  const price = Number(form.price)
  const discountedPrice = form.discountedPrice ? Number(form.discountedPrice) : 0
  if (!form.name.trim()) return "Product name is required."
  if (!form.category.trim()) return "Select a product category."
  if (!Number.isFinite(price) || price < 0) return "Enter a valid product price."
  if (form.currency.trim() && !/^[A-Za-z]{3}$/.test(form.currency.trim())) return "Enter a valid 3-letter currency code."
  if (discountedPrice && discountedPrice > price) return "Discounted price cannot be higher than original price."
  if (form.demoVideoUrl.trim() && !/^https?:\/\/.+/i.test(form.demoVideoUrl.trim())) return "Enter a valid demo video URL."
  if (form.imageUrls.length > 5) return "Upload a maximum of 5 product images."
  return ""
}

export function ProductForm({
  token,
  form,
  setForm,
  categories,
}: {
  token: string
  form: ProductFormState
  setForm: (updater: (current: ProductFormState) => ProductFormState) => void
  categories: string[]
}) {
  const [uploading, setUploading] = useState<"images" | "presentation" | null>(null)

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return
    const incoming = Array.from(files).slice(0, Math.max(0, 5 - form.imageUrls.length))
    if (incoming.length === 0) {
      toast.error("Upload a maximum of 5 product images.")
      return
    }
    if (incoming.some((file) => !file.type.startsWith("image/"))) {
      toast.error("Product images must be PNG, JPG, GIF, or WebP.")
      return
    }
    try {
      setUploading("images")
      const uploaded: string[] = []
      for (const file of incoming) {
        const media = await api.uploadMedia(token, file)
        uploaded.push(media.url)
      }
      setForm((current) => ({ ...current, imageUrls: [...current.imageUrls, ...uploaded].slice(0, 5) }))
      toast.success("Product images uploaded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload product images.")
    } finally {
      setUploading(null)
    }
  }

  async function uploadPresentation(file: File | undefined) {
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("Presentation material must be a PDF.")
      return
    }
    try {
      setUploading("presentation")
      const media = await api.uploadMedia(token, file)
      setForm((current) => ({ ...current, presentationUrl: media.url }))
      toast.success("Presentation material uploaded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload presentation material.")
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product Name" required>
          <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Smart visitor lead capture kit" required />
        </Field>
        <Field label="Category" required>
          <select required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none">
            <option value="">Select category</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          {categories.length === 0 && <p className="text-xs text-slate-500">Add company categories in Company Profile settings first.</p>}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Original Price" required>
          <Input type="number" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="125000" required />
        </Field>
        <Field label="Discounted Price">
          <Input type="number" min="0" value={form.discountedPrice} onChange={(event) => setForm((current) => ({ ...current, discountedPrice: event.target.value }))} placeholder="99000" />
        </Field>
        <Field label="Currency">
          <Input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))} placeholder="KES" maxLength={3} />
        </Field>
      </div>

      <RichTextField label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} placeholder="Describe what the product does, who it helps, and why expo visitors should ask about it." />
      <RichTextField label="Specifications" value={form.specifications} onChange={(value) => setForm((current) => ({ ...current, specifications: value }))} placeholder="Add package contents, technical specs, sizes, integrations, warranty, or delivery terms." />

      <Field label="Product Demo Video Link">
        <Input type="url" value={form.demoVideoUrl} onChange={(event) => setForm((current) => ({ ...current, demoVideoUrl: event.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
      </Field>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Field label="Product Images">
          <div className="rounded-2xl border border-border/80 bg-elevated/50 p-4">
            <div className="grid gap-3 sm:grid-cols-5">
              {form.imageUrls.map((url) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card">
                  <img src={mediaUrl(url)} alt="Product image" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((item) => item !== url) }))} className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-danger opacity-0 shadow transition group-hover:opacity-100">Remove</button>
                </div>
              ))}
              {form.imageUrls.length === 0 && <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-center text-xs font-medium text-slate-400">No images</div>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={(event) => { uploadImages(event.target.files); event.target.value = "" }} className="max-w-sm" />
              <span className="text-xs text-slate-500">{form.imageUrls.length}/5 images</span>
              {uploading === "images" && <span className="text-xs text-slate-500">Uploading...</span>}
            </div>
          </div>
        </Field>

        <Field label="Product Presentation Material">
          <div className="rounded-2xl border border-border/80 bg-elevated/50 p-4">
            <Input type="file" accept="application/pdf" onChange={(event) => { uploadPresentation(event.target.files?.[0]); event.target.value = "" }} />
            {uploading === "presentation" && <p className="mt-2 text-xs text-slate-500">Uploading PDF...</p>}
            {form.presentationUrl && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-card p-3 text-sm">
                <span className="min-w-0 truncate text-slate-600">{form.presentationUrl}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, presentationUrl: "" }))}>Remove</Button>
              </div>
            )}
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status">
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProductPayload["status"] }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none">
            <option value="available">Available</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-slate-600">Featured</label>
          <label className="flex h-12 items-center gap-2 rounded-xl border border-border/80 bg-elevated px-4 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} className="h-5 w-5 rounded border-border" />
            <span className="text-slate-500">Mark as featured product</span>
          </label>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-600">{label}{required && <span className="text-red-500"> *</span>}</label>{children}</div>
}

function RichTextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  }, [value])

  function command(name: string) {
    document.execCommand(name)
    onChange(ref.current?.innerHTML || "")
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-elevated">
        <div className="flex flex-wrap gap-1 border-b border-border/70 bg-card px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => command("bold")}>B</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => command("italic")}>I</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => command("insertUnorderedList")}>List</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => command("removeFormat")}>Clear</Button>
        </div>
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-label={label}
          data-placeholder={placeholder}
          onInput={() => onChange(ref.current?.innerHTML || "")}
          className="min-h-36 px-4 py-3 text-sm leading-6 text-foreground outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        />
      </div>
    </div>
  )
}
