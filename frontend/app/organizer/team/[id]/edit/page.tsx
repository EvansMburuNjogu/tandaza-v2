"use client"

import { PageHeader } from "@/components/admin/page-header"
import { BackLink } from "@/components/ui/back-link"
import { Card } from "@/components/ui/card"

export default function EditTeamMemberPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Member Editing Disabled"
        description="Remove and re-add a team member if their login details need to change."
        actions={<BackLink href="/organizer/team" label="Back to Team" />}
      />
      <Card className="max-w-2xl p-6 text-sm text-slate-600">
        Organizer team members are real login users. To avoid access drift, editing is disabled for now; the main organizer can remove a member and create a new login with a fresh temporary password.
      </Card>
    </div>
  )
}
