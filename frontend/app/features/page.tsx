import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"
import {
  IconCalendar, IconClipboard, IconBell, IconHandshake,
  IconCreditCard, IconFileInvoice, IconBarChart, IconBank,
  IconTicket, IconSearch, IconPhone, IconStar,
  IconTrendUp, IconStore, IconLightbulb, IconGlobe,
  IconLock,
} from "@/components/marketing/icons"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Features : Tandaza",
  description: "Explore every feature of Tandaza: Africa's end-to-end expo management platform. Payments, analytics, visitor portals, exhibitor tools, and more.",
  alternates: { canonical: "https://tandaza.com/features" },
}

type Feature = { icon: ReactNode; title: string; body: string }
type Group = { label: string; color: string; features: Feature[] }

const FEATURE_GROUPS: Group[] = [
  {
    label: "Expo management",
    color: "indigo",
    features: [
      { icon: <IconHandshake />, title: "Exhibitor management", body: "Onboard exhibitors, manage exhibitor assignments, track activation status, and communicate with all exhibitors from one place." },
      { icon: <IconClipboard />, title: "Exhibitor applications", body: "Configurable application forms, document uploads, approval workflows, and automatic confirmation emails." },
      { icon: <IconCalendar />, title: "Schedule & sessions", body: "Build conference programmes, assign speakers, and publish live agendas visitors can browse and bookmark." },
      { icon: <IconBell />, title: "Announcements & alerts", body: "Push real-time updates to exhibitors and visitors: schedule changes, exhibitor updates, or emergency notifications." },
    ],
  },
  {
    label: "Payments & finance",
    color: "emerald",
    features: [
      { icon: <IconCreditCard />, title: "Platform fee collection", body: "Accept exhibitor payments via Paystack, M-Pesa, card, or bank transfer. Automatic receipts and reconciliation." },
      { icon: <IconFileInvoice />, title: "Sponsor invoicing", body: "Generate branded invoices for sponsorship packages, track payment status, and send automated reminders." },
      { icon: <IconBarChart />, title: "Revenue dashboard", body: "Real-time income tracking by expo, exhibitor tier, and payment method. One-click CSV exports." },
      { icon: <IconBank />, title: "Automated settlements", body: "Define payout schedules and settle to organizer bank accounts automatically after each expo closes." },
    ],
  },
  {
    label: "Visitor experience",
    color: "sky",
    features: [
      { icon: <IconTicket />, title: "Visitor registration", body: "Custom registration forms, QR badge generation, pre-visit email sequences, and on-site check-in scanning." },
      { icon: <IconSearch />, title: "Exhibitor directory", body: "Searchable exhibitor listings with categories, product catalogues, and map locations for each exhibitor." },
      { icon: <IconPhone />, title: "Mobile app", body: "Native iOS and Android app for visitors to plan visits, scan exhibitor QR codes, and save contacts." },
      { icon: <IconStar />, title: "Meeting requests and pre-orders", body: "Visitors request meetings with exhibitors and submit pre-order intent directly through the platform, before or during the event." },
    ],
  },
  {
    label: "Analytics & insights",
    color: "violet",
    features: [
      { icon: <IconTrendUp />, title: "Attendance analytics", body: "Live foot traffic counts, peak hour analysis, and per-zone breakdowns, visible to organisers in real time." },
      { icon: <IconStar />, title: "Exhibitor lead CRM", body: "Every QR scan or visitor interaction becomes a lead. Exhibitors set temperature, track status, log follow-up activities, and export leads to CSV." },
      { icon: <IconLightbulb />, title: "Sponsor ROI reports", body: "Impression counts, engagement rates, and conversion metrics packaged into sponsor-ready PDF reports." },
      { icon: <IconGlobe />, title: "Multi-country reporting", body: "Aggregate or per-country dashboards for organisers running expos across multiple African markets." },
    ],
  },
]

const colorMap: Record<string, { badge: string; iconWrap: string; iconColor: string }> = {
  indigo: { badge: "bg-indigo-50 text-indigo-700 border-indigo-100", iconWrap: "bg-indigo-50 border-indigo-100", iconColor: "text-indigo-600" },
  emerald: { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", iconWrap: "bg-emerald-50 border-emerald-100", iconColor: "text-emerald-600" },
  sky: { badge: "bg-sky-50 text-sky-700 border-sky-100", iconWrap: "bg-sky-50 border-sky-100", iconColor: "text-sky-600" },
  violet: { badge: "bg-violet-50 text-violet-700 border-violet-100", iconWrap: "bg-violet-50 border-violet-100", iconColor: "text-violet-600" },
}

const PRICING_STRIP = [
  { icon: <IconClipboard />, label: "Applications" },
  { icon: <IconTicket />, label: "Visitor reg." },
  { icon: <IconBarChart />, label: "Analytics" },
  { icon: <IconPhone />, label: "Mobile app" },
  { icon: <IconLock />, label: "SSL security" },
  { icon: <IconGlobe />, label: "Multi-country" },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="pointer-events-none absolute inset-0 bg-topo opacity-50" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-20 text-center lg:px-8 lg:py-28">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Platform features</p>
          <h1 className="text-[2.8rem] font-bold tracking-[-0.035em] text-white sm:text-[3.6rem]">
            Everything you need<br />
            <span style={{ background: "linear-gradient(110deg, #a5b4fc 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              to run an expo.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-[1.8] text-slate-400">
            From first workspace application to final settlement : Tandaza handles every step of the exhibition lifecycle.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Start for free
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/[0.12]">
              View pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Included in all plans strip */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-10 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Included in all plans</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {PRICING_STRIP.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{f.icon}</span>
                <span className="text-[11px] font-semibold text-slate-600">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature groups */}
      <div className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[1200px] space-y-20">
          {FEATURE_GROUPS.map((g) => {
            const c = colorMap[g.color]
            return (
              <div key={g.label}>
                <div className="mb-8 flex items-center gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${c.badge}`}>
                    {g.label}
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {g.features.map((f) => (
                    <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${c.iconWrap} ${c.iconColor}`}>
                        {f.icon}
                      </span>
                      <h3 className="text-[14px] font-bold text-slate-900">{f.title}</h3>
                      <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{f.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white px-6 py-20 text-center lg:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Ready to see it in action?</h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-slate-500">Start free, no credit card required. Your first expo is on us.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Get started free
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
              View pricing
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
