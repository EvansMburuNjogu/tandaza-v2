"use client"

import Link from "next/link"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"

const globalLinks = [
  { label: "System Users", href: "/administrator/users", description: "Internal administrators and support operators." },
  { label: "Notifications", href: "/administrator/notifications", description: "Global delivery history, retries, and test sends." },
  { label: "Audit Logs", href: "/administrator/audit-logs", description: "Security and business mutation trail." },
  { label: "Categories", href: "/administrator/categories", description: "Expo taxonomy shared by every country." },
  { label: "Countries", href: "/administrator/countries", description: "Country onboarding, default currency, and timezone." },
  { label: "Settings", href: "/administrator/settings", description: "Global email, WhatsApp, and Paystack configuration." }
]

const countryScopedLinks = [
  "Overview",
  "Expos",
  "Organizers",
  "Exhibitors",
  "Visitors",
  "Reports & Analytics",
  "Payments",
  "Settlements",
  "Sponsors",
  "Sponsor Plans",
  "Ads"
]

export default function GlobalFunctionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Functions"
        description="Platform-wide controls live here. Country-specific work stays under the selected country context."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-border/80 bg-card p-3">
          <nav className="space-y-1" aria-label="Global functions">
            {globalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-md px-3 py-3 text-sm transition hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-primary">
                <span className="font-semibold text-foreground">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          <Card className="border-border/80 bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Global Administration</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              These functions affect the whole Tandaza platform across countries. Use them for platform users, shared expo categories, market onboarding, provider configuration, notifications, and audit review.
            </p>
          </Card>

          <Card className="border-border/80 bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Country-Scoped Screens</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              These pages respond to the admin country switcher and refetch data for Kenya, Ghana, Nigeria, South Africa, or all countries.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {countryScopedLinks.map((item) => (
                <span key={item} className="rounded-md border border-border bg-elevated px-3 py-2 text-sm font-medium text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
