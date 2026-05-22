import type { Metadata } from "next"
import { SessionGuard } from "@/components/auth/session-guard"
import { OrganizerShell } from "@/components/organizer/organizer-shell"

export const metadata: Metadata = {
  title: "Tandaza - Organizer",
  description: "Tandaza organizer workspace"
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard allowedRoles={["organizer"]}>
      <OrganizerShell>{children}</OrganizerShell>
    </SessionGuard>
  )
}