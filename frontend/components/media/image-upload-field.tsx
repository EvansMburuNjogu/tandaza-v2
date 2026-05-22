"use client"

import { ChangeEvent, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn, mediaUrl } from "@/lib/utils"

type ImageUploadFieldProps = {
  token?: string
  value?: string
  onChange: (url: string) => void
  label: string
  description?: string
  aspectClassName?: string
  imageClassName?: string
}

export function ImageUploadField({ token, value, onChange, label, description, aspectClassName, imageClassName }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const previewUrl = mediaUrl(value)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Upload an image file.")
      return
    }
    try {
      setUploading(true)
      const media = await api.uploadMedia(token || "", file)
      setPreviewFailed(false)
      onChange(media.url)
      toast.success("Image uploaded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className={cn("relative flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-elevated", aspectClassName)}>
          {previewUrl && !previewFailed ? (
            <img src={previewUrl} alt={label} className={cn("absolute inset-0 h-full w-full", imageClassName || "object-cover")} onError={() => setPreviewFailed(true)} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-slate-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">IMG</span>
              <span className="text-sm font-medium">{previewFailed ? "Image preview unavailable" : "No image uploaded"}</span>
              {previewFailed && <span className="max-w-xs text-xs text-slate-400">Upload a fresh image or save again to refresh the stored logo URL.</span>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={handleFileChange} />
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading || !token}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange("")} disabled={uploading}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
