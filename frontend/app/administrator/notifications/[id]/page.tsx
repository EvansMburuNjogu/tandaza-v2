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
import { getNotificationByID } from "@/lib/admin-entities"
import { formatDate } from "@/lib/utils"

export default function NotificationDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["notification", params.id], queryFn: () => getNotificationByID(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Notification not found" message="This notification record does not exist in the current dataset." />

  const item = query.data

  return (
    <div className="space-y-6">
      <PageHeader title="Notification Detail" description="Review delivery metadata, channel status, and recipient context for a sent notification." actions={<BackLink href="/administrator/notifications" label="Back" />} />
      <DetailCard
        title={item.subject}
        items={[
          { label: "Recipient", value: item.recipient },
          { label: "Recipient Role", value: item.role },
          { label: "Channel", value: item.channel.toUpperCase() },
          { label: "Message", value: item.message || "No message" },
          { label: "Status", value: <StatusBadge value={item.status} /> },
          { label: "Sent", value: formatDate(item.sentAt) }
        ]}
      />
    </div>
  )
}
