"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { NotificationRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell, DateCell, PillBadge } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

function channelTone(channel: string): "info" | "warning" | "primary" {
  const c = channel.toLowerCase()
  if (c === "email") return "info"
  if (c === "sms") return "warning"
  return "primary"
}

function displayRecipient(record: NotificationRecord) {
  return record.recipient?.trim() || "Recipient"
}

export default function NotificationsPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.getAdminNotifications(token || ""),
    enabled: Boolean(token)
  })
  const retryMutation = useMutation({
    mutationFn: (id: string) => api.retryAdminNotification(token || "", id),
    onSuccess: async () => {
      toast.success("Notification retry queued")
      await query.refetch()
    },
    onError: (error) => toast.error("Could not retry notification", { description: error instanceof Error ? error.message : "Try again." })
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<NotificationRecord>
      title="Notification Delivery"
      description="Audit all outbound messaging by channel, recipient role, and delivery state."
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="notifications.csv"
      searchPlaceholder="Search by recipient, subject, or message…"
      searchText={(r) => `${displayRecipient(r)} ${r.subject} ${r.message} ${r.channel}`}
      statusAccessor={(r) => r.status}
      rowActions={[
        { label: "Open delivery log", onClick: (r) => router.push(`/administrator/notifications/${r.id}`) },
        { label: "Retry delivery", onClick: (r) => retryMutation.mutate(r.id) }
      ]}
      emptyTitle="No notifications found"
      emptyDescription="No notifications match your query."
      columns={[
        {
          key: "recipient", header: "Recipient", sortable: true, sortValue: (r) => displayRecipient(r),
          exportValue: (r) => `${displayRecipient(r)} - ${r.role}`,
          render: (r) => <AvatarCell name={displayRecipient(r)} sub={r.role} />
        },
        {
          key: "channel", header: "Channel", sortable: true, exportValue: (r) => r.channel.toUpperCase(),
          render: (r) => <PillBadge value={r.channel.toUpperCase()} tone={channelTone(r.channel)} />
        },
        {
          key: "subject", header: "Subject", sortable: true, exportValue: (r) => r.subject,
          render: (r) => <span className="text-sm text-foreground">{r.subject}</span>
        },
        {
          key: "message", header: "Message", sortable: true, exportValue: (r) => r.message,
          render: (r) => <span className="line-clamp-2 max-w-[360px] text-sm leading-6 text-slate-500">{r.message || "No message"}</span>
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        },
        {
          key: "sentAt", header: "Sent", sortable: true, sortValue: (r) => r.sentAt,
          exportValue: (r) => formatDate(r.sentAt),
          render: (r) => <DateCell value={r.sentAt} />
        }
      ]}
    />
  )
}
