"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DetailCard } from "@/components/admin/detail-card"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { BackLink } from "@/components/ui/back-link"
import { useSessionStore } from "@/store/session-store"
import { getAuditLogByID } from "@/lib/admin-entities"
import { formatDate } from "@/lib/utils"

export default function AuditLogDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["audit-log", params.id], queryFn: () => getAuditLogByID(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Audit entry not found" message="This audit entry does not exist in the current dataset." />

  const item = query.data

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Entry" description="Inspect the full metadata behind a recorded admin or platform activity entry." actions={<BackLink href="/administrator/audit-logs" label="Back" />} />
      <DetailCard
        title={item.action}
        items={[
          { label: "Actor", value: item.actor },
          { label: "Actor Role", value: item.actorRole },
          { label: "Entity", value: item.entity },
          { label: "Target", value: item.target },
          { label: "IP Address", value: <span className="font-mono text-xs">{item.ipAddress}</span> },
          { label: "Timestamp", value: formatDate(item.timestamp) }
        ]}
      />
    </div>
  )
}
