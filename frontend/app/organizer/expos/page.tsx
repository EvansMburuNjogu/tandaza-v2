"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { StatusBadge } from "@/components/admin/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { ExpoRecord } from "@/lib/api/contracts"
import { formatCurrency, mediaUrl } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

export default function OrganizerExposPage() {
  const token = useSessionStore((s) => s.token)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ["organizer-expos"], queryFn: () => api.getOrganizerExpos(token || ""), enabled: Boolean(token) })
  const submitMutation = useMutation({
    mutationFn: (expo: ExpoRecord) => api.submitOrganizerExpo(token || "", expo.id),
    onSuccess: async (_, expo) => {
      await client.invalidateQueries({ queryKey: ["organizer-expos"] })
      toast.success(`${expo.name} submitted for review`)
    },
    onError: (error) => toast.error("Could not submit expo", { description: error instanceof Error ? error.message : "Try again." })
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Expos"
        description="Create drafts, monitor lifecycle status, and open each expo workspace."
        actions={<Link href="/organizer/expos/new"><Button>Create Expo</Button></Link>}
      />
      {query.data.items.length === 0 ? (
        <Card className="p-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">No expos found</h2>
          <p className="mt-2 text-sm text-slate-500">Create your first expo draft to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((expo) => <ExpoCard key={expo.id} expo={expo} onSubmit={() => submitMutation.mutate(expo)} submitting={submitMutation.isPending} />)}
        </div>
      )}
    </div>
  )
}

function ExpoCard({ expo, onSubmit, submitting }: { expo: ExpoRecord; onSubmit: () => void; submitting: boolean }) {
  const image = mediaUrl(expo.coverImageUrl || expo.coverImage)
  const canSubmit = expo.status === "draft" || expo.status === "needs_changes"
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-elevated">
        {image ? <img src={image} alt={expo.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">Expo image</div>}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="line-clamp-1 text-lg font-semibold text-foreground">{expo.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{expo.location}</p>
          </div>
          <StatusBadge value={expo.status.replaceAll("_", " ")} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Dates" value={expo.dates} />
          <Metric label="Exhibitors" value={String(expo.exhibitors)} />
          <Metric label="Activation Fee" value={formatCurrency(expo.exhibitorFee, expo.currency)} />
          <Metric label="Currency" value={expo.currency} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link href={`/organizer/expos/${expo.id}`}><Button size="sm">View Details</Button></Link>
          {canSubmit && <Button size="sm" variant="secondary" onClick={onSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>}
          {canSubmit && <Link href={`/organizer/expos/${expo.id}/edit`}><Button size="sm" variant="secondary">Edit</Button></Link>}
        </div>
      </div>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 font-medium text-foreground">{value}</p></div>
}
