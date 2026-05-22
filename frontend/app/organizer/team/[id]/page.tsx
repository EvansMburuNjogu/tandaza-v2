"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

export default function TeamMemberDetailPage() {
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
        description="Team member access details"
        actions={<BackLink href="/organizer/team" label="Back to Team" />}
      />

      <Card className="max-w-2xl p-6">
        <h3 className="mb-4 text-lg font-semibold">Profile Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-right">{data.name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-right">{data.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Access</span>
            <span className="font-medium capitalize">{data.role === "owner" ? "Main organizer" : "Team member"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Status</span>
            <span className="font-medium capitalize">{data.status}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
