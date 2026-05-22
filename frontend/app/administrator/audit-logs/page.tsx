"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ResourcePage } from "@/components/admin/resource-page"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { AuditLogRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell, DateCell, PillBadge, RoleBadge } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

function actionTone(action: string): "danger" | "warning" | "success" | "neutral" {
  const a = action.toLowerCase()
  if (a.includes("delete") || a.includes("suspend") || a.includes("revoke") || a.includes("reject")) return "danger"
  if (a.includes("update") || a.includes("edit") || a.includes("modify")) return "warning"
  if (a.includes("create") || a.includes("approve") || a.includes("activate")) return "success"
  return "neutral"
}

export default function AuditLogsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => api.getAdminAuditLogs(token || ""),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<AuditLogRecord>
      title="Audit Logs"
      description="Trace high-impact admin actions and important platform activity with actor and target context."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="audit-logs.csv"
      searchPlaceholder="Search by actor, action, entity, or target…"
      searchText={(r) => `${r.actor} ${r.action} ${r.entity} ${r.target}`}
      rowActions={[
        { label: "Open entry", onClick: (r) => router.push(`/administrator/audit-logs/${r.id}`) }
      ]}
      emptyTitle="No audit logs found"
      emptyDescription="No audit entries match the current search."
      columns={[
        {
          key: "actor", header: "Actor", sortable: true, sortValue: (r) => r.actor,
          exportValue: (r) => `${r.actor} - ${r.actorRole}`,
          render: (r) => <AvatarCell name={r.actor} sub={r.actorRole} />
        },
        {
          key: "action", header: "Action", sortable: true, exportValue: (r) => r.action,
          render: (r) => <PillBadge value={r.action} tone={actionTone(r.action)} />
        },
        {
          key: "entity", header: "Entity", sortable: true, exportValue: (r) => r.entity,
          render: (r) => <RoleBadge role={r.entity} />
        },
        {
          key: "target", header: "Target", sortable: true, exportValue: (r) => r.target,
          render: (r) => <span className="text-sm text-slate-500">{r.target}</span>
        },
        {
          key: "ipAddress", header: "IP Address", sortable: true, exportValue: (r) => r.ipAddress,
          render: (r) => (
            <span className="font-mono text-xs text-slate-400">{r.ipAddress}</span>
          )
        },
        {
          key: "timestamp", header: "Timestamp", sortable: true, sortValue: (r) => r.timestamp,
          exportValue: (r) => formatDate(r.timestamp),
          render: (r) => <DateCell value={r.timestamp} />
        }
      ]}
    />
  )
}
