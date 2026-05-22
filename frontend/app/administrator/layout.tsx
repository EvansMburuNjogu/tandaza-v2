import type { Metadata } from "next"
import { SessionGuard } from "@/components/auth/session-guard"
import { AdminShell } from "@/components/admin/app-shell"

export const metadata: Metadata = {
  title: "Tandaza - Administrator",
  description: "Tandaza administrator console"
}

export default function AdministratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard allowedRoles={["administrator", "super_administrator"]}>
      <AdminShell>{children}</AdminShell>
    </SessionGuard>
  )
}
