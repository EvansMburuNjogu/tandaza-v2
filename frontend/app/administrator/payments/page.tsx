"use client"

import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { PaymentRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"
import { CurrencyCell, DateCell, EntityCell, PillBadge } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { useConfirm } from "@/components/ui/confirm-provider"

function paymentTone(method: string): "primary" | "info" | "warning" {
  if (method === "paystack") return "primary"
  if (method === "card") return "info"
  return "warning"
}

export default function PaymentsPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const confirm = useConfirm()
  const query = useQuery({
    queryKey: ["admin-payments", selectedCountry],
    queryFn: () => api.getAdminPayments(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<PaymentRecord>
      title="Payments"
      description="Review all payments processed across expos, sponsorships, and platform activity."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="payments.csv"
      searchPlaceholder="Search by payer, reference, or expo…"
      searchText={(r) => `${r.reference} ${r.payerName} ${r.expoName}`}
      statusAccessor={(r) => r.status}
      rowActions={[
        {
          label: "Mark failed",
          tone: "danger",
          onClick: async (r) => {
            const accepted = await confirm({ title: "Mark payment failed", description: `Mark ${r.reference} as failed. This is for failed provider or reconciliation cases.`, confirmLabel: "Mark failed", tone: "danger" })
            if (!accepted || !token) return
            try {
              await api.updateAdminPaymentStatus(token, r.id, "failed", "Marked failed during admin reconciliation")
              await query.refetch()
              toast.success("Payment marked failed.")
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update payment.")
            }
          }
        },
        {
          label: "Cancel pending",
          tone: "danger",
          onClick: async (r) => {
            const accepted = await confirm({ title: "Cancel pending payment", description: `Cancel ${r.reference}. Only pending payments can be cancelled.`, confirmLabel: "Cancel payment", tone: "danger" })
            if (!accepted || !token) return
            try {
              await api.updateAdminPaymentStatus(token, r.id, "cancelled", "Cancelled during admin reconciliation")
              await query.refetch()
              toast.success("Payment cancelled.")
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update payment.")
            }
          }
        },
        {
          label: "Record refund",
          tone: "danger",
          onClick: async (r) => {
            const accepted = await confirm({ title: "Record refund", description: `Record ${r.reference} as refunded. Confirm the provider refund has already been completed.`, confirmLabel: "Record refund", tone: "danger" })
            if (!accepted || !token) return
            try {
              await api.updateAdminPaymentStatus(token, r.id, "refunded", "Provider refund recorded by admin")
              await query.refetch()
              toast.success("Refund recorded.")
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update payment.")
            }
          }
        }
      ]}
      emptyTitle="No payments found"
      emptyDescription="No platform payments match the current filters."
      columns={[
        { key: "reference", header: "Reference", sortable: true, sortValue: (r) => r.reference, exportValue: (r) => `${r.reference} - ${r.expoName}`, render: (r) => <EntityCell primary={r.reference} sub={r.expoName} /> },
        { key: "payerName", header: "Payer", sortable: true, exportValue: (r) => `${r.payerName} - ${r.payerRole}`, render: (r) => <EntityCell primary={r.payerName} sub={r.payerRole} /> },
        { key: "amount", header: "Amount", sortable: true, sortValue: (r) => r.amount, exportValue: (r) => formatCurrency(r.amount, r.currency), render: (r) => <CurrencyCell value={formatCurrency(r.amount, r.currency)} /> },
        { key: "method", header: "Method", sortable: true, exportValue: (r) => r.method, render: (r) => <PillBadge value={r.method} tone={paymentTone(r.method)} /> },
        { key: "status", header: "Status", sortable: true, exportValue: (r) => r.status, render: (r) => <StatusBadge value={r.status} /> },
        { key: "paidAt", header: "Paid At", sortable: true, sortValue: (r) => r.paidAt, exportValue: (r) => formatDate(r.paidAt), render: (r) => <DateCell value={r.paidAt} /> }
      ]}
    />
  )
}
