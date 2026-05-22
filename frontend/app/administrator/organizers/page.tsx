"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { OrganizerRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { AvatarCell, DateCell, NumericCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function OrganizersPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-organizers", selectedCountry],
    queryFn: () => api.getAdminOrganizers(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<OrganizerRecord>
      title="Organizer Management"
      description="Review organizer companies, verification state, and expo ownership from one list."
      actionLabel="Add Organizer"
      actionHref="/administrator/organizers/new"
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="organizers.csv"
      searchPlaceholder="Search by name, company, or email…"
      searchText={(r) => `${r.name} ${r.company} ${r.email}`}
      statusAccessor={(r) => r.status}
      rowActions={[
        { label: "View organizer", onClick: (r) => router.push(`/administrator/organizers/${r.id}`) }
      ]}
      emptyTitle="No organizers found"
      emptyDescription="Try adjusting your search or status filter."
      columns={[
        {
          key: "name", header: "Organizer", sortable: true, sortValue: (r) => r.name,
          exportValue: (r) => `${r.name} - ${r.company}`,
          render: (r) => <AvatarCell name={r.name} sub={r.company} />
        },
        {
          key: "email", header: "Email", sortable: true, exportValue: (r) => r.email,
          render: (r) => <span className="text-sm text-slate-500">{r.email}</span>
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        },
        {
          key: "expos", header: "Expos", sortable: true, exportValue: (r) => r.expos,
          render: (r) => <NumericCell value={r.expos} />
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
