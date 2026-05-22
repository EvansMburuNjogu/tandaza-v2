"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { formatCurrency, formatDate } from "@/lib/utils"

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/10 text-success",
    pending: "bg-amber-500/10 text-amber-600",
    expired: "bg-slate-500/10 text-slate-500",
    cancelled: "bg-danger/10 text-danger"
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[value] || styles.pending}`}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

export default function SponsorDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-sponsor", params.id],
    queryFn: () => api.getOrganizerSponsor(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (error || !data) return <ErrorState title="Sponsor not found" />

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.company}
        description="Sponsor details and commission earnings"
        actions={<BackLink href="/organizer/sponsors" label="Back to Sponsors" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Commission Earned</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(data.commissionEarned)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Paid</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(data.totalPaid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Status</p>
          <div className="mt-1">
            <StatusBadge value={data.status} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Company Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Company Name</span>
              <span className="font-medium">{data.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact Name</span>
              <span className="font-medium">{data.contactName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium">{data.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Joined</span>
              <span className="font-medium">{formatDate(data.joinedAt)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Commission Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Commission Rate</span>
              <span className="font-medium">{data.commissionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Commissioned By</span>
              <span className="font-medium">{data.commissionedBy}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => router.push(`/organizer/sponsors/${params.id}/edit`)}>Edit Sponsor</Button>
      </div>
    </div>
  )
}
