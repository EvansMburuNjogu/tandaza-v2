"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DetailCard } from "@/components/admin/detail-card"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { BackLink } from "@/components/ui/back-link"
import { StatusBadge } from "@/components/admin/status-badge"
import { useSessionStore } from "@/store/session-store"
import { getVisitorByID } from "@/lib/admin-entities"
import { formatDate } from "@/lib/utils"

export default function VisitorDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["visitor", params.id], queryFn: () => getVisitorByID(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Visitor not found" message="This visitor record does not exist in the current dataset." />

  const visitor = query.data

  return (
    <div className="space-y-6">
      <PageHeader title="Visitor Details" description="Inspect visitor account details, engagement metrics, and platform activity." actions={<BackLink href="/administrator/visitors" label="Back" />} />
      <DetailCard
        title={visitor.name}
        items={[
          { label: "Email", value: visitor.email },
          { label: "Status", value: <StatusBadge value={visitor.status} /> },
          { label: "Expos Attended", value: visitor.exposAttended },
          { label: "Interactions", value: visitor.interactions },
          { label: "Last Activity", value: formatDate(visitor.lastActivity) },
          { label: "Created", value: formatDate(visitor.createdAt) }
        ]}
      />
    </div>
  )
}
