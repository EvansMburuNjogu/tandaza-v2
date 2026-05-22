"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { ExhibitorRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { AvatarCell, DateCell, NumericCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function ExhibitorsPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-exhibitors", selectedCountry],
    queryFn: () => api.getAdminExhibitors(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<ExhibitorRecord>
      title="Exhibitor Management"
      description="Approve exhibitors, inspect profiles, and monitor expo assignments at scale."
      actionLabel="Invite Exhibitor"
      actionHref="/administrator/exhibitors/new"
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="exhibitors.csv"
      searchPlaceholder="Search by company, contact, or email…"
      searchText={(r) => `${r.company} ${r.contact} ${r.email}`}
      statusAccessor={(r) => r.status}
      rowActions={[
        { label: "View profile", onClick: (r) => router.push(`/administrator/exhibitors/${r.id}`) }
      ]}
      emptyTitle="No exhibitors found"
      emptyDescription="No exhibitor records match the current filters."
      columns={[
        {
          key: "company", header: "Company", sortable: true, sortValue: (r) => r.company,
          exportValue: (r) => `${r.company} - ${r.contact}`,
          render: (r) => <AvatarCell name={r.company} sub={r.contact} />
        },
        {
          key: "email", header: "Email", sortable: true, exportValue: (r) => r.email,
          render: (r) => <span className="text-sm text-slate-500">{r.email}</span>
        },
        {
          key: "assignedExpos", header: "Assigned Expos", sortable: true, sortValue: (r) => r.assignedExpos,
          exportValue: (r) => r.assignedExpos,
          render: (r) => <NumericCell value={r.assignedExpos} />
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
