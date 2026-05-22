"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { DataTable } from "@/components/admin/data-table"
import { StatusBadge } from "@/components/admin/status-badge"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import { formatCurrency } from "@/lib/utils"
import type { OrganizerSponsor } from "@/lib/api/contracts"

export default function OrganizerSponsorsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["organizer-sponsors"],
    queryFn: () => api.getOrganizerSponsors(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const sponsors = query.data
  const totalCommission = sponsors.reduce((sum, s) => sum + s.commissionEarned, 0)
  const activeSponsors = sponsors.filter((s) => s.status === "active").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sponsors"
        description="Manage your invited sponsors and track commission earnings."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Sponsors</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{sponsors.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Active Sponsors</p>
          <p className="mt-2 text-2xl font-semibold text-success">{activeSponsors}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Commission</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(totalCommission)}</p>
        </Card>
      </div>

      <DataTable<OrganizerSponsor>
        columns={[
          {
            key: "company", header: "Company", sortable: true,
            render: (r) => (
              <div>
                <p className="font-medium text-foreground">{r.company}</p>
                <p className="text-sm text-slate-500">{r.contactName}</p>
              </div>
            )
          },
          {
            key: "commissionRate", header: "Commission Rate", sortable: true,
            render: (r) => <span className="font-mono text-sm">{r.commissionRate}%</span>
          },
          {
            key: "totalPaid", header: "Total Paid", sortable: true,
            render: (r) => <span className="font-mono text-sm">{formatCurrency(r.totalPaid)}</span>
          },
          {
            key: "commissionEarned", header: "Commission", sortable: true,
            render: (r) => <span className="font-mono text-sm text-success">{formatCurrency(r.commissionEarned)}</span>
          },
          {
            key: "status", header: "Status", sortable: true,
            render: (r) => <StatusBadge value={r.status} />
          }
        ]}
        rows={sponsors}
        rowActions={[
          { label: "View details", onClick: (r) => router.push(`/organizer/sponsors/${r.id}`) }
        ]}
        emptyTitle="No sponsors yet"
        emptyDescription="Sponsor invitations are currently handled by the platform administrator."
      />
    </div>
  )
}
