"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { SettlementRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"
import { CurrencyCell, DateCell, EntityCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function SettlementsPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-settlements", selectedCountry],
    queryFn: () => api.getAdminSettlements(token || "", selectedCountry),
    enabled: Boolean(token)
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" | "disbursed" }) => api.updateAdminSettlementStatus(token || "", id, status),
    onSuccess: async () => {
      toast.success("Settlement status updated")
      await query.refetch()
    },
    onError: (error) => toast.error("Could not update settlement", { description: error instanceof Error ? error.message : "Try again." })
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<SettlementRecord>
      title="Settlement Review"
      description="Review organizer payout workflows, approval states, and finance exposure before disbursement."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="settlements.csv"
      searchPlaceholder="Search by reference, expo, or organizer…"
      searchText={(r) => `${r.reference} ${r.expo} ${r.organizer}`}
      statusAccessor={(r) => r.status}
      rowActions={[
        { label: "Review settlement", onClick: (r) => router.push(`/administrator/settlements/${r.id}`) },
        { label: "Approve settlement", onClick: (r) => statusMutation.mutate({ id: r.id, status: "approved" }) },
        { label: "Disburse settlement", onClick: (r) => window.confirm("Mark this settlement as disbursed?") && statusMutation.mutate({ id: r.id, status: "disbursed" }) },
        { label: "Reject settlement", tone: "danger", onClick: (r) => window.confirm("Reject this settlement?") && statusMutation.mutate({ id: r.id, status: "rejected" }) }
      ]}
      emptyTitle="No settlements found"
      emptyDescription="No settlement records match the current filters."
      columns={[
        {
          key: "reference", header: "Reference", sortable: true, sortValue: (r) => r.reference,
          exportValue: (r) => `${r.reference} - ${r.expo}`,
          render: (r) => <EntityCell primary={r.reference} sub={r.expo} />
        },
        {
          key: "organizer", header: "Organizer", sortable: true, exportValue: (r) => r.organizer,
          render: (r) => <span className="text-sm font-medium text-foreground">{r.organizer}</span>
        },
        {
          key: "amount", header: "Amount", sortable: true, sortValue: (r) => r.amount,
          exportValue: (r) => formatCurrency(r.amount, r.currency),
          render: (r) => <CurrencyCell value={formatCurrency(r.amount, r.currency)} />
        },
        {
          key: "commission", header: "Commission", sortable: true, sortValue: (r) => r.commission,
          exportValue: (r) => formatCurrency(r.commission, r.currency),
          render: (r) => <CurrencyCell value={formatCurrency(r.commission, r.currency)} />
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        },
        {
          key: "createdAt", header: "Created", sortable: true, sortValue: (r) => r.createdAt,
          exportValue: (r) => formatDate(r.createdAt),
          render: (r) => <DateCell value={r.createdAt} />
        }
      ]}
    />
  )
}
