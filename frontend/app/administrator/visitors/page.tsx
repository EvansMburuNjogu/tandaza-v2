"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { VisitorRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { AvatarCell, DateCell, NumericCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function VisitorsPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-visitors", selectedCountry],
    queryFn: () => api.getAdminVisitors(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<VisitorRecord>
      title="Visitor Management"
      description="Monitor visitor account activity, expo engagement, and audience-level platform health."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="visitors.csv"
      searchPlaceholder="Search by name or email…"
      searchText={(r) => `${r.name} ${r.email}`}
      statusAccessor={(r) => r.status}
      rowActions={[
        { label: "View profile", onClick: (r) => router.push(`/administrator/visitors/${r.id}`) }
      ]}
      emptyTitle="No visitors found"
      emptyDescription="No visitor accounts match the current search."
      columns={[
        {
          key: "name", header: "Visitor", sortable: true, sortValue: (r) => r.name,
          exportValue: (r) => `${r.name} - ${r.email}`,
          render: (r) => <AvatarCell name={r.name} sub={r.email} />
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        },
        {
          key: "exposAttended", header: "Expos", sortable: true, exportValue: (r) => r.exposAttended,
          render: (r) => <NumericCell value={r.exposAttended} />
        },
        {
          key: "interactions", header: "Interactions", sortable: true, exportValue: (r) => r.interactions,
          render: (r) => <NumericCell value={r.interactions} />
        },
        {
          key: "lastActivity", header: "Last Active", sortable: true, sortValue: (r) => r.lastActivity,
          exportValue: (r) => formatDate(r.lastActivity),
          render: (r) => <DateCell value={r.lastActivity} />
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
