"use client"

import { useQuery } from "@tanstack/react-query"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { VisitorRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell, DateCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function OrganizerVisitorsPage() {
  const token = useSessionStore((s) => s.token)
  const query = useQuery({
    queryKey: ["organizer-visitors"],
    queryFn: () => api.getOrganizerVisitors(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <ResourcePage<VisitorRecord>
      title="Visitors"
      description="Track visitors attending your expos and their engagement."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="visitors.csv"
      searchPlaceholder="Search by name or email…"
      searchText={(r) => `${r.name} ${r.email}`}
      statusAccessor={(r) => r.status}
      emptyTitle="No visitors yet"
      emptyDescription="Visitors will appear here after they register for your expos."
      columns={[
        {
          key: "name", header: "Visitor", sortable: true, sortValue: (r) => r.name,
          exportValue: (r) => r.name,
          render: (r) => <AvatarCell name={r.name} />
        },
        {
          key: "email", header: "Email", sortable: true, exportValue: (r) => r.email,
          render: (r) => <span className="text-sm text-slate-500">{r.email}</span>
        },
        {
          key: "exposAttended", header: "Expos", sortable: true, exportValue: (r) => r.exposAttended,
          render: (r) => <span className="text-sm font-medium">{r.exposAttended}</span>
        },
        {
          key: "interactions", header: "Interactions", sortable: true, exportValue: (r) => r.interactions,
          render: (r) => <span className="text-sm text-slate-500">{r.interactions}</span>
        },
        {
          key: "lastActivity", header: "Last Activity", sortable: true, exportValue: (r) => r.lastActivity,
          render: (r) => <DateCell value={r.lastActivity} />
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        }
      ]}
    />
  )
}
