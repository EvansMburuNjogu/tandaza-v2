"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

const PLACEMENT_OPTIONS = [
  { value: "banner", label: "Banner (728x90)", price: 15000, description: "Horizontal banner for web pages" },
  { value: "sidebar", label: "Sidebar (300x250)", price: 10000, description: "Square ad for sidebars" },
  { value: "popup", label: "Popup (500x400)", price: 20000, description: "Modal popup advertisement" },
  { value: "video", label: "Video Pre-roll (1920x1080)", price: 25000, description: "Video ad before content" }
]

export default function NewSponsorAdPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["sponsor-campaigns"],
    queryFn: () => api.getSponsorCampaigns(token || ""),
    enabled: Boolean(token)
  })

  const [form, setForm] = useState({
    name: "",
    campaignId: "",
    placement: "banner" as "banner" | "sidebar" | "popup" | "video",
    mediaUrl: "",
    budget: 15000
  })

  const selectedPlacement = PLACEMENT_OPTIONS.find(p => p.value === form.placement)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const campaign = campaigns?.find(c => c.id === form.campaignId)
    
    const adData = {
      name: form.name,
      campaignId: form.campaignId,
      campaignName: campaign?.name || "",
      placement: form.placement,
      dimensions: selectedPlacement?.label.split("(")[1]?.replace(")", "") || "728x90",
      mediaUrl: form.mediaUrl,
      mediaType: "image" as const,
      budget: selectedPlacement?.price || 15000,
      status: "pending_payment" as const
    }

    try {
      const newAd = await api.createSponsorAd(token || "", adData)
      toast.success("Ad created. Complete payment to send it for admin approval.")
      router.push(`/sponsor/ads/${newAd.id}/payment`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create ad")
    }
  }

  if (campaignsLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Create Ad"
          description="Create a new advertisement with payment"
          actions={<BackLink href="/sponsor/ads" label="Back to Ads" />}
        />

        <Card className="max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Ad Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Summer Promo Banner"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Campaign (Optional)</label>
              <select
                value={form.campaignId}
                onChange={(e) => setForm(f => ({ ...f, campaignId: e.target.value }))}
                className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm"
              >
                <option value="">Select a campaign</option>
                {campaigns?.filter(c => c.status === "active" || c.status === "draft").map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Placement Type</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {PLACEMENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.placement === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="placement"
                      value={option.value}
                      checked={form.placement === option.value}
                      onChange={(e) => setForm(f => ({ 
                        ...f, 
                        placement: e.target.value as any,
                        budget: option.price
                      }))}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-slate-500">{option.description}</p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(option.price)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Media URL (Image or Video)</label>
              <Input
                value={form.mediaUrl}
                onChange={(e) => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                placeholder="https://example.com/ad-image.jpg"
              />
              <p className="text-xs text-slate-500">Enter URL to your ad creative (image or video)</p>
            </div>

            <div className="p-4 bg-elevated rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(selectedPlacement?.price || 0)}</p>
                </div>
                <p className="text-sm text-slate-500">One-time payment</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button type="submit">Create & Pay</Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/sponsor/ads")}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </SessionGuard>
  )
}
