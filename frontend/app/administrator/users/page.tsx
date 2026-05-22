"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { UserRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell, DateCell, RoleBadge } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { toast } from "sonner"

export default function UsersPage() {
  const token = useSessionStore((s) => s.token)
  const currentUser = useSessionStore((s) => s.user)
  const router = useRouter()
  const client = useQueryClient()
  const [userToRemove, setUserToRemove] = useState<UserRecord | null>(null)
  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.getAdminUsers(token || ""),
    enabled: Boolean(token)
  })
  const removeMutation = useMutation({
    mutationFn: (user: UserRecord) => api.deleteAdminUser(token || "", user.id),
    onSuccess: () => {
      toast.success("System user removed.")
      setUserToRemove(null)
      client.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove system user")
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <>
      <ResourcePage<UserRecord>
        title="System Users"
        description="Manage Tandaza administrator accounts with platform-level access."
        actionLabel="Add System User"
        actionHref="/administrator/users/new"
        stats={query.data.stats}
        rows={query.data.items}
        exportFileName="system-users.csv"
        searchPlaceholder="Search by name, email, or role…"
        searchText={(r) => `${r.name} ${r.email} ${r.role}`}
        statusAccessor={(r) => r.status}
        rowActions={[
          { label: "Edit user", onClick: (r) => router.push(`/administrator/users/${r.id}/edit`) },
          { label: "Remove user", tone: "danger", hidden: (r) => r.id === currentUser?.id, onClick: (r) => setUserToRemove(r) }
        ]}
        emptyTitle="No system users found"
        emptyDescription="No administrator accounts match the current filters."
        columns={[
          {
            key: "name", header: "System User", sortable: true, sortValue: (r) => r.name,
            exportValue: (r) => `${r.name} - ${r.email}`,
            render: (r) => <AvatarCell name={r.name} sub={r.email} />
          },
          {
            key: "role", header: "Role", sortable: true, exportValue: (r) => r.role,
            render: (r) => <RoleBadge role={r.role} />
          },
          {
            key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
            render: (r) => <StatusBadge value={r.status} />
          },
          {
            key: "lastLogin", header: "Last Login", sortable: true, sortValue: (r) => r.lastLogin,
            exportValue: (r) => formatDate(r.lastLogin),
            render: (r) => <DateCell value={r.lastLogin} />
          },
          {
            key: "createdAt", header: "Created", sortable: true, sortValue: (r) => r.createdAt,
            exportValue: (r) => formatDate(r.createdAt),
            render: (r) => <DateCell value={r.createdAt} />
          }
        ]}
      />
      {userToRemove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="remove-user-title" onClick={() => !removeMutation.isPending && setUserToRemove(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell" onClick={(event) => event.stopPropagation()}>
            <div className="px-6 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-red-500">Remove Access</p>
              <h2 id="remove-user-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Remove system user?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {userToRemove.name} will lose administrator access. Tandaza will keep an audit log of this action.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={removeMutation.isPending} onClick={() => setUserToRemove(null)}>Cancel</Button>
              <Button type="button" variant="danger" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(userToRemove)}>{removeMutation.isPending ? "Removing..." : "Remove"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
