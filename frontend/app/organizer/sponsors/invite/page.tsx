"use client"

import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { BackLink } from "@/components/ui/back-link"

export default function InviteSponsorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sponsor Invitations Disabled"
        description="Sponsor onboarding is currently handled by the platform administrator."
        actions={<BackLink href="/organizer/sponsors" label="Back to Sponsors" />}
      />

      <Card className="max-w-2xl border-dashed p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Organizer sponsor invitations are not available.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Existing sponsor relationships remain visible here, but new sponsor creation is controlled from the administrator workspace.
        </p>
      </Card>
    </div>
  )
}
