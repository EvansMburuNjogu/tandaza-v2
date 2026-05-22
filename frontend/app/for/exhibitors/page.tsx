import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"
import { IconStore, IconStar, IconBarChart, IconCreditCard, IconTrendUp, IconBell, IconIdCard, IconChat } from "@/components/marketing/icons"

export const metadata: Metadata = {
  title: "For Exhibitors : Tandaza",
  description: "Activate your digital workspace, manage your product catalogue, capture leads with a full CRM, and track every visitor interaction from the Tandaza exhibitor portal.",
  alternates: { canonical: "https://tandaza.com/for/exhibitors" },
}

const FEATURES = [
  { icon: <IconIdCard />, title: "Workspace QR code", body: "Get a unique workspace QR code visitors scan on-site to save your details instantly. Copy, share, or download it for print." },
  { icon: <IconStore />, title: "Product catalogue", body: "Build a digital product showcase per expo. Add images, mark items active, and let visitors browse and show interest before the event." },
  { icon: <IconStar />, title: "Full lead CRM", body: "Every visitor interaction becomes a lead. Set temperature, update status, add notes, schedule follow-ups, and record calls, emails, WhatsApps, and meetings." },
  { icon: <IconChat />, title: "Meeting requests", body: "Receive and manage meeting requests from visitors directly in your workspace. Never miss a sales conversation." },
  { icon: <IconBarChart />, title: "Workspace analytics", body: "Track QR scans, product views, visitor engagement, and lead conversion summaries for every expo you attend." },
  { icon: <IconCreditCard />, title: "One-off activation fee", body: "Pay a single digital workspace activation fee per expo. View receipts and payment history directly in your portal." },
]

export default function ExhibitorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="absolute inset-0">
          <Image src="/image5.jpeg" alt="Professional Made in Africa Expo activation" fill priority
            className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 py-28 lg:px-8 lg:py-36">
          <div className="max-w-[620px]">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400">For exhibitors</p>
            <h1 className="text-[3rem] font-bold leading-[1.04] tracking-[-0.035em] text-white sm:text-[4rem]">
              Showcase your brand.<br />
              <span style={{ background: "linear-gradient(110deg, #6ee7b7 0%, #34d399 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Capture real leads.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[1rem] leading-[1.8] text-slate-300">
              Activate your digital workspace, manage a live product catalogue, and turn every visitor scan into a tracked lead, with a full CRM built right into your exhibitor workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(152,63%,42%) 0%, hsl(160,72%,38%) 100%)", boxShadow: "0 4px 20px rgba(16,185,129,0.35)" }}>
                Start exhibiting
              </Link>
              <Link href="/features"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.14]">
                See all features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="border-b border-slate-100 bg-white px-6 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-6 sm:grid-cols-4">
          {[["500+", "Expos to exhibit at"], ["12", "Countries"], ["3×", "More leads vs. manual"], ["48h", "Avg. application approval"]].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-[2rem] font-bold tabular-nums leading-none"
                style={{ background: "linear-gradient(135deg, hsl(152,63%,42%) 0%, hsl(160,72%,38%) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {n}
              </p>
              <p className="mt-1.5 text-[12px] font-semibold text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600">Exhibitor tools</p>
            <h2 className="text-[2.2rem] font-bold tracking-tight text-slate-900">Every workspace visitor is a trackable lead.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">{f.icon}</span>
                <h3 className="text-[14.5px] font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo detail */}
      <section className="bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600">Your exhibitor portal</p>
            <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">A full CRM built into your workspace.</h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-slate-500">
              Every visitor who scans your QR code or shows interest in a product becomes a lead in your CRM. Track temperature, update status, log follow-up activities, and export the full list after every show.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Leads automatically created from QR scans and visitor interest",
                "Set lead temperature: hot, warm, or cold",
                "Update lead status from new through to won or lost",
                "Log follow-up activities: call, email, WhatsApp, meeting, or note",
                "Set next follow-up dates and get notified when they are due",
                "Export all leads to CSV after every expo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(152,63%,42%) 0%, hsl(160,72%,38%) 100%)" }}>
              Create exhibitor account
            </Link>
          </div>
          <div className="relative h-80 overflow-hidden rounded-3xl shadow-md lg:h-[460px]">
            <Image src="/image12.jpeg" alt="Standard Bank corporate expo activation" fill className="object-cover" sizes="50vw" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-6 py-20 text-center lg:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Ready to exhibit smarter?</h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-slate-500">Create a free account and start browsing expos across Africa today.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(152,63%,42%) 0%, hsl(160,72%,38%) 100%)" }}>
              Get started free
            </Link>
            <Link href="/features"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">
              See all features
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
