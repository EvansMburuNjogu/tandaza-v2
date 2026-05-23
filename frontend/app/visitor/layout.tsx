import type { Metadata } from "next"
import { SessionGuard } from "@/components/auth/session-guard"
import { VisitorShell } from "@/components/visitor/visitor-shell"

export const metadata: Metadata = {
  title: "Tandaza - Visitor",
  description: "Tandaza visitor account"
}

export default function VisitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <VisitorShell>{children}</VisitorShell>
    </SessionGuard>
  )
}
