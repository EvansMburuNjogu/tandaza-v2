"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

export default function TeamMemberDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)

  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-team-member", params.id],
    queryFn: () => api.getOrganizerTeamMember(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  if (isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (error || !data) return <ErrorState title="Team member not found" />

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description="Team member details and permissions"
        actions={<BackLink href="/organizer/team" label="Back to Team" />}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="font-medium">{data.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium">{data.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-medium">{data.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-medium">{data.status}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Permissions</h3>
          <div className="space-y-2">
            {data.permissions?.map((perm: string) => (
              <div key={perm} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {data.role !== "owner" && (
        <div className="flex gap-3">
          <Button onClick={() => router.push(`/organizer/team/${params.id}/edit`)}>Edit Member</Button>
        </div>
      )}
    </div>
  )
}
