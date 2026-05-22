import { Metadata } from "next"
import { SponsorShell } from "@/components/sponsor/sponsor-shell"
import { sponsorNavItems } from "@/lib/config/routes"

export const metadata: Metadata = {
  title: "Tandaza - Sponsor"
}

export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SponsorShell navItems={sponsorNavItems}>
      {children}
    </SponsorShell>
  )
}