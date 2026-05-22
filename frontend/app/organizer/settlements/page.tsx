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
import type { OrganizerSettlementRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function OrganizerSettlementsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["organizer-settlements"],
    queryFn: () => api.getOrganizerSettlements(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const settlements = query.data

  const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0)
  const totalPayout = settlements.reduce((sum, s) => sum + s.netAmount, 0)
  const totalCommission = settlements.reduce((sum, s) => sum + s.commission, 0)
  const pending = settlements.filter((s) => String(s.status || "").includes("pending")).length
  const currency = settlements[0]?.currency || "KES"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        description="Track your earnings, commissions, and payout status."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(totalAmount, currency)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Commission</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(totalCommission, currency)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Payout Due</p>
          <p className="mt-2 text-2xl font-semibold text-success">{formatCurrency(totalPayout, currency)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-warning">{pending}</p>
        </Card>
      </div>

      <DataTable<OrganizerSettlementRecord>
        columns={[
          {
            key: "reference", header: "Reference", sortable: true,
            render: (r) => (
              <button 
                onClick={() => router.push(`/organizer/settlements/${r.id}`)}
                className="font-mono text-sm text-primary hover:underline"
              >
                {r.reference}
              </button>
            )
          },
          {
            key: "expo", header: "Expo", sortable: true,
            render: (r) => <span className="font-medium">{r.expo}</span>
          },
          {
            key: "period", header: "Period", sortable: true,
            render: (r) => <span className="text-sm text-slate-500">{r.period}</span>
          },
          {
            key: "amount", header: "Gross", sortable: true,
            render: (r) => <span className="font-mono">{formatCurrency(r.amount, r.currency)}</span>
          },
          {
            key: "commission", header: "Commission", sortable: true,
            render: (r) => <span className="font-mono text-primary">{formatCurrency(r.commission, r.currency)}</span>
          },
          {
            key: "netAmount", header: "Payout Due", sortable: true,
            render: (r) => <span className="font-mono font-semibold text-success">{formatCurrency(r.netAmount, r.currency)}</span>
          },
          {
            key: "status", header: "Status", sortable: true,
            render: (r) => <StatusBadge value={r.status} />
          },
          {
            key: "createdAt", header: "Date", sortable: true,
            render: (r) => <span className="text-sm text-slate-500">{formatDate(r.createdAt)}</span>
          }
        ]}
        rows={settlements}
        emptyTitle="No settlements yet"
        emptyDescription="Settlements will appear here after your expos are processed."
      />
    </div>
  )
}
