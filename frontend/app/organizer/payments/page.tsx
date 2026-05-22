"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { OrganizerPaymentRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { CurrencyCell, DateCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { EntityCell } from "@/components/admin/cells"
import { formatCurrency } from "@/lib/utils"

export default function OrganizerPaymentsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["organizer-payments"],
    queryFn: () => api.getOrganizerPayments(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <ResourcePage<OrganizerPaymentRecord>
      title="Payments"
      description="View payments received for your expos."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="payments.csv"
      searchPlaceholder="Search by reference or payer…"
      searchText={(r) => `${r.reference} ${r.payerName} ${r.expoName}`}
      statusAccessor={(r) => r.status}
      emptyTitle="No payments yet"
      emptyDescription="Payments will appear here when exhibitors pay for your expos."
      columns={[
        {
          key: "reference", header: "Reference", sortable: true, sortValue: (r) => r.reference,
          render: (r) => <span className="font-mono text-sm">{r.reference}</span>
        },
        {
          key: "payerName", header: "From", sortable: true, sortValue: (r) => r.payerName,
          render: (r) => <EntityCell primary={r.payerName} sub={r.payerRole} />
        },
        {
          key: "expoName", header: "Expo", sortable: true, exportValue: (r) => r.expoName,
          render: (r) => <span className="font-medium">{r.expoName}</span>
        },
        {
          key: "amount", header: "Amount", sortable: true, exportValue: (r) => formatCurrency(r.amount, r.currency),
          render: (r) => <CurrencyCell value={formatCurrency(r.amount, r.currency)} />
        },
        {
          key: "method", header: "Method", sortable: true, exportValue: (r) => r.method,
          render: (r) => <span className="text-sm capitalize">{r.method}</span>
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        },
        {
          key: "paidAt", header: "Paid", sortable: true, exportValue: (r) => r.paidAt,
          render: (r) => <DateCell value={r.paidAt} />
        },
        {
          key: "actions", header: "Receipt",
          render: (r) => r.status === "paid" ? (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => router.push(`/organizer/payments/${r.id}/receipt`)}
            >
              View Receipt
            </Button>
          ) : <span className="text-sm text-slate-400">-</span>
        }
      ]}
    />
  )
}
