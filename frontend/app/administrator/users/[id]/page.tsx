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
import { RoleBadge } from "@/components/admin/cells"
import { useSessionStore } from "@/store/session-store"
import { getSystemUserByID } from "@/lib/admin-entities"
import { formatDate } from "@/lib/utils"

export default function SystemUserDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["system-user", params.id], queryFn: () => getSystemUserByID(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="System user not found" message="This internal account does not exist in the current dataset." />

  const user = query.data

  return (
    <div className="space-y-6">
      <PageHeader title="System User Details" description="Review internal operator account information and recent access context." actions={<Link href={`/administrator/users/${user.id}/edit`} className="inline-flex items-center rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-card">Edit User</Link>} />
      <DetailCard
        title={user.name}
        actions={<BackLink href="/administrator/users" label="Back" />}
        items={[
          { label: "Email", value: user.email },
          { label: "Role", value: <RoleBadge role={user.role} /> },
          { label: "Status", value: <StatusBadge value={user.status} /> },
          { label: "Last Login", value: formatDate(user.lastLogin) },
          { label: "Created", value: formatDate(user.createdAt) }
        ]}
      />
    </div>
  )
}
