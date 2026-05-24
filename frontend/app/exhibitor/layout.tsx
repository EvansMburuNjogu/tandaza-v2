import type { Metadata } from "next"
import { SessionGuard } from "@/components/auth/session-guard"
import { OrganizerShell } from "@/components/organizer/organizer-shell"
import { exhibitorNavItems } from "@/lib/config/routes"

export const metadata: Metadata = {
  title: "Tandaza - Exhibitor",
  description: "Tandaza exhibitor workspace"
}

export default function ExhibitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard allowedRoles={["exhibitor"]}>
      <OrganizerShell navItems={exhibitorNavItems} tourRole="exhibitor">{children}</OrganizerShell>
    </SessionGuard>
  )
}
