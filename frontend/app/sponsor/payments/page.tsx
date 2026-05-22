"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { formatCurrency } from "@/lib/utils"

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    paid: "bg-success/10 text-success",
    pending: "bg-amber-500/10 text-amber-600",
    failed: "bg-danger/10 text-danger",
    refunded: "bg-slate-500/10 text-slate-500"
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[value] || styles.pending}`}>
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  )
}

export default function SponsorPaymentsPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["sponsor-payments"],
    queryFn: () => api.getSponsorPayments(token || ""),
    enabled: Boolean(token)
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-slate-500">Loading payments...</p>
      </div>
    )
  }

  if (error) return <ErrorState title="Failed to load payments" />

  const payments = data

  const filteredPayments = payments.filter((p) =>
    p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.adName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
  const currency = payments[0]?.currency || "KES"

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Payments"
          description="View your payment history for ads."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Payments</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{payments.length}</p>
            </div>
          </Card>
          <Card className="p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-success/5 rounded-full -mr-10 -mt-10" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Total Paid</p>
              <p className="mt-1 text-2xl font-bold text-success">{formatCurrency(totalPaid, currency)}</p>
            </div>
          </Card>
          <Card className="p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{payments.filter(p => p.status === "pending").length}</p>
            </div>
          </Card>
        </div>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <input
                type="text"
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 max-w-md rounded-xl border border-border bg-elevated px-4 py-2 text-sm"
              />
            </div>

            <DataTable<typeof payments[0]>
              columns={[
                { key: "reference", header: "Reference", sortable: true, render: (r) => <span className="font-mono text-sm">{r.reference}</span> },
                { key: "adName", header: "Ad", render: (r) => <span className="font-medium">{r.adName}</span> },
                { key: "amount", header: "Amount", sortable: true, render: (r) => <span className="font-mono">{formatCurrency(r.amount, r.currency)}</span> },
                { key: "paymentMethod", header: "Method", render: (r) => <span className="text-sm text-slate-500">{r.paymentMethod}</span> },
                { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
                { key: "paidAt", header: "Date", sortable: true, render: (r) => <span className="text-sm text-slate-500">{new Date(r.paidAt).toLocaleDateString()}</span> },
                { key: "actions", header: "Receipt", render: (r) => r.status === "paid" && (
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/sponsor/payments/${r.id}/receipt`)}>Download</Button>
                )}
              ]}
              rows={filteredPayments}
              pageSize={10}
              emptyTitle="No payments yet"
              emptyDescription="Your payment history will appear here."
            />
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
