"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { DataTable } from "@/components/admin/data-table"
import { StatusBadge } from "@/components/admin/status-badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import type { ExhibitorPaymentRecord } from "@/lib/api/contracts"
import { formatCurrency } from "@/lib/utils"

export default function ExhibitorPaymentsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["exhibitor-payments"],
    queryFn: () => api.getExhibitorPayments(token || ""),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const payments = query.data
  
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0)
  const paidCount = payments.filter((p) => p.status === "paid").length
  const currency = payments[0]?.currency || "KES"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="View your payment history and manage outstanding payments."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Spent</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(totalSpent, currency)}</p>
          </div>
        </Card>
        <Card className="p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-success/5 rounded-full -mr-10 -mt-10 group-hover:bg-success/10 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Payments Made</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-success">{paidCount}</p>
          </div>
        </Card>
        <Card className="p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-slate-500/5 rounded-full -mr-10 -mt-10 group-hover:bg-slate-500/10 transition-colors" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Payments</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{payments.length}</p>
          </div>
        </Card>
      </div>

      <DataTable<ExhibitorPaymentRecord>
        columns={[
          {
            key: "reference", header: "Reference", sortable: true,
            render: (r) => <span className="font-mono text-sm">{r.reference}</span>
          },
          {
            key: "expoName", header: "Expo", sortable: true,
            render: (r) => <span className="font-medium">{r.expoName}</span>
          },
          {
            key: "description", header: "Description",
            render: (r) => <span className="text-sm text-slate-500">{r.description}</span>
          },
          {
            key: "amount", header: "Amount", sortable: true,
            render: (r) => <span className="font-mono">{formatCurrency(r.amount, r.currency)}</span>
          },
          {
            key: "status", header: "Status", sortable: true,
            render: (r) => <StatusBadge value={r.status} />
          },
          {
            key: "paidAt", header: "Paid On", sortable: true,
            render: (r) => <span className="text-sm text-slate-500">{new Date(r.paidAt).toLocaleDateString()}</span>
          },
          {
            key: "actions", header: "Receipt",
            render: (r) => r.status === "paid" ? (
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => router.push(`/exhibitor/payments/${r.id}/receipt`)}
              >
                View Receipt
              </Button>
            ) : <span className="text-sm text-slate-400">-</span>
          }
        ]}
        rows={payments}
        emptyTitle="No payments yet"
        emptyDescription="Your payment history will appear here."
      />
    </div>
  )
}
