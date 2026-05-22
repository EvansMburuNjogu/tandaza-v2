"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { OrganizerTeamMember } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { toast } from "sonner"

export default function OrganizerTeamPage() {
  const token = useSessionStore((s) => s.token)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["organizer-team"],
    queryFn: () => api.getOrganizerTeam(token || ""),
    enabled: Boolean(token)
  })
  const removeMutation = useMutation({
    mutationFn: (member: OrganizerTeamMember) => api.deleteOrganizerTeamMember(token || "", member.id),
    onSuccess: async () => {
      toast.success("Team member removed")
      await queryClient.invalidateQueries({ queryKey: ["organizer-team"] })
    },
    onError: (error) => {
      toast.error("Could not remove team member", { description: error instanceof Error ? error.message : "Try again." })
    }
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
      description="Add organizer team members who can sign in and work under your company account."
      actionLabel="Add Team Member"
      actionHref="/organizer/team/new"
      stats={stats}
      rows={rows}
      exportFileName="team.csv"
      searchPlaceholder="Search by name or email…"
      searchText={(r) => `${r.name} ${r.email}`}
      statusAccessor={(r) => r.status}
      emptyTitle="No team members yet"
      emptyDescription="Add team members to help manage the organizer portal."
      rowActions={[
        {
          label: "Delete member",
          tone: "danger",
          hidden: (r) => r.role === "owner",
          onClick: (r) => {
            if (!window.confirm(`Remove ${r.name} from this organizer account?`)) {
              return
            }
            removeMutation.mutate(r)
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
          key: "role", header: "Access", sortable: true, exportValue: (r) => r.role,
          render: (r) => <span className="text-sm font-medium capitalize text-slate-600">{r.role === "owner" ? "Main organizer" : "Team member"}</span>
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        }
      ]}
    />
  )
}
