"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AdCreative = {
  name?: string
  campaignName?: string
  placement?: string
  dimensions?: string
  mediaUrl?: string
  mediaType?: string
}

function isVideo(ad: AdCreative) {
  return ad.mediaType?.toLowerCase() === "video"
}

function creativeTitle(ad: AdCreative) {
  return ad.name || ad.campaignName || "Ad creative"
}

export function AdCreativeThumb({ ad, onClick }: { ad: AdCreative; onClick?: () => void }) {
  const [failed, setFailed] = useState(false)
  const canShowImage = Boolean(ad.mediaUrl) && !isVideo(ad) && !failed
  const label = `${creativeTitle(ad)} preview`

  const content = (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated">
        {canShowImage ? (
          <img
            src={ad.mediaUrl}
            alt={label}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {isVideo(ad) ? "Video" : "Banner"}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{creativeTitle(ad)}</p>
        <p className="mt-0.5 text-xs capitalize text-slate-500">
          {[ad.placement, ad.dimensions].filter(Boolean).join(" / ") || "Creative"}
        </p>
      </div>
    </div>
  )

  if (!onClick) return content

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-xl text-left transition hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-ring/35"
      aria-label={`View ${label}`}
    >
      {content}
    </button>
  )
}

export function AdPreviewDialog({ ad, onClose }: { ad: AdCreative | null; onClose: () => void }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [ad?.mediaUrl])
  if (!ad) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="Ad preview">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close preview" />
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-float">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">{creativeTitle(ad)}</p>
            <p className="mt-1 text-sm capitalize text-slate-500">
              {[ad.campaignName, ad.placement, ad.dimensions].filter(Boolean).join(" / ")}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div className={cn("flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-elevated", !ad.mediaUrl && "p-6")}>
          {ad.mediaUrl && isVideo(ad) ? (
            <video className="h-full w-full bg-black object-contain" controls preload="metadata" src={ad.mediaUrl} />
          ) : ad.mediaUrl && !failed ? (
            <img
              src={ad.mediaUrl}
              alt={`${creativeTitle(ad)} full preview`}
              className="h-full w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No creative file available</p>
              <p className="mt-1 text-xs text-slate-500">The ad metadata is saved, but no preview asset is attached.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
