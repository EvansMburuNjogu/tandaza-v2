"use client"

import { useQuery } from "@tanstack/react-query"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { ExhibitorRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell, DateCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { safeDisplay } from "@/lib/utils"

export default function OrganizerExhibitorsPage() {
  const token = useSessionStore((s) => s.token)
  const query = useQuery({
    queryKey: ["organizer-exhibitors"],
    queryFn: () => api.getOrganizerExhibitors(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <ResourcePage<ExhibitorRecord>
      title="Exhibitors"
      description="View and manage exhibitors participating in your expos."
      actionLabel="Invite Exhibitor"
      actionHref="/organizer/exhibitors/invite"
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="exhibitors.csv"
      searchPlaceholder="Search by company or contact…"
      searchText={(r) => `${safeDisplay(r.company)} ${safeDisplay(r.contact)} ${safeDisplay(r.email)}`}
      statusAccessor={(r) => r.status}
      emptyTitle="No exhibitors yet"
      emptyDescription="Exhibitors will appear here after being assigned to your expos."
      columns={[
        {
          key: "company", header: "Company", sortable: true, sortValue: (r) => r.company,
          exportValue: (r) => safeDisplay(r.company),
          render: (r) => <AvatarCell name={safeDisplay(r.company)} sub={safeDisplay(r.contact)} />
        },
        {
          key: "email", header: "Email", sortable: true, exportValue: (r) => safeDisplay(r.email),
          render: (r) => <span className="text-sm text-slate-500">{safeDisplay(r.email)}</span>
        },
        {
          key: "assignedExpos", header: "Assigned Expo", sortable: true, exportValue: (r) => r.assignedExpos,
          render: (r) => <span className="text-sm font-medium">{r.assignedExpos}</span>
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        },
        {
          key: "createdAt", header: "Joined", sortable: true, exportValue: (r) => r.createdAt,
          render: (r) => <DateCell value={r.createdAt} />
        }
      ]}
    />
  )
}
