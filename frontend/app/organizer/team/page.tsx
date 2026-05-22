"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { OrganizerTeamMember } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { PillBadge } from "@/components/admin/cells"
import { toast } from "sonner"

export default function OrganizerTeamPage() {
  const token = useSessionStore((s) => s.token)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["organizer-team"],
    queryFn: () => api.getOrganizerTeam(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const rows = query.data.map((member) => ({
    ...member,
    permissions: Array.isArray(member.permissions) ? member.permissions : []
  }))
  const stats = [
    { id: "total", label: "Team Members", value: String(rows.length), delta: "Active", trend: "neutral" as const },
    { id: "active", label: "Active", value: String(rows.filter((r) => r.status === "active").length), delta: "Working", trend: "up" as const }
  ]

  return (
    <ResourcePage<OrganizerTeamMember>
      title="Team"
      description="Manage your team members and their permissions."
      actionLabel="Add Team Member"
      actionHref="/organizer/team/new"
      stats={stats}
      rows={rows}
      exportFileName="team.csv"
      searchPlaceholder="Search by name or email…"
      searchText={(r) => `${r.name} ${r.email}`}
      statusAccessor={(r) => r.status}
      emptyTitle="No team members yet"
      emptyDescription="Add team members to help manage your expos."
      rowActions={[
        { label: "View details", onClick: (r) => router.push(`/organizer/team/${r.id}`) },
        {
          label: "Edit member",
          onClick: (r) => {
            if (r.role === "owner") {
              toast.info("Owner account details are managed from Settings.")
              return
            }
            router.push(`/organizer/team/${r.id}/edit`)
          }
        }
      ]}
      columns={[
        {
          key: "name", header: "Member", sortable: true, sortValue: (r) => r.name,
          exportValue: (r) => r.name,
          render: (r) => <AvatarCell name={r.name} sub={r.email} />
        },
        {
          key: "role", header: "Role", sortable: true, exportValue: (r) => r.role,
          render: (r) => <PillBadge value={r.role} tone="primary" />
        },
        {
          key: "permissions", header: "Permissions", 
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.permissions.slice(0, 2).map((p) => (
                <span key={p} className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-slate-500">
                  {p.split(":")[0]}
                </span>
              ))}
              {r.permissions.length > 2 && (
                <span className="text-[10px] text-slate-400">+{r.permissions.length - 2}</span>
              )}
            </div>
          )
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        }
      ]}
    />
  )
}
