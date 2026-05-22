import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"
import { IconSearch, IconTicket, IconStore, IconPhone, IconBookmark, IconIdCard, IconChat, IconBell } from "@/components/marketing/icons"

export const metadata: Metadata = {
  title: "For Visitors : Tandaza",
  description: "Discover expos across Africa, register in seconds, engage exhibitors before and during the event, and keep the value long after the expo ends.",
  alternates: { canonical: "https://tandaza.com/for/visitors" },
}

const FEATURES = [
  { icon: <IconSearch />, title: "Expo discovery", body: "Search expos by country, city, category, date, and industry. Browse live, upcoming, and completed events in one place." },
  { icon: <IconTicket />, title: "Registration and access", body: "Register for any expo in seconds. Get a digital QR badge for physical check-in, or join remotely from anywhere." },
  { icon: <IconStore />, title: "Exhibitor and product browsing", body: "Browse the full exhibitor directory and product catalogues before you arrive. Show interest in products or request meetings in advance." },
  { icon: <IconIdCard />, title: "Scan and connect", body: "Scan exhibitor QR codes at physical exhibitor stands to save their contact details instantly. No paper business cards needed." },
  { icon: <IconChat />, title: "Meeting requests", body: "Request meetings with exhibitors directly through the platform, before or during the event. Submit pre-order intent for products you discover." },
  { icon: <IconBell />, title: "Reminders and follow-ups", body: "Receive expo reminders, post-expo follow-up emails, and access expo content and exhibitor details long after the event ends." },
]

export default function VisitorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="absolute inset-0">
          <Image src="/image8.webp" alt="Crowds at Uganda international trade expo" fill priority
            className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 py-28 lg:px-8 lg:py-36">
          <div className="max-w-[620px]">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-sky-400">For visitors</p>
            <h1 className="text-[3rem] font-bold leading-[1.04] tracking-[-0.035em] text-white sm:text-[4rem]">
              Discover, engage,<br />
              <span style={{ background: "linear-gradient(110deg, #7dd3fc 0%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                and follow up.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[1rem] leading-[1.8] text-slate-300">
              Search expos by country, industry, and date. Register in seconds, engage exhibitors and products before you arrive, and keep the value long after the event ends.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(199,89%,48%) 0%, hsl(210,100%,56%) 100%)", boxShadow: "0 4px 20px rgba(14,165,233,0.35)" }}>
                Explore expos
              </Link>
              <Link href="/features"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.14]">
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="border-b border-slate-100 bg-white px-6 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-6 sm:grid-cols-4">
          {[["80K+", "Registered visitors"], ["500+", "Expos to explore"], ["12", "Countries"], ["Free", "Always free for visitors"]].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-[2rem] font-bold tabular-nums leading-none"
                style={{ background: "linear-gradient(135deg, hsl(199,89%,48%) 0%, hsl(210,100%,56%) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-sky-600">Visitor experience</p>
            <h2 className="text-[2.2rem] font-bold tracking-tight text-slate-900">Discover, engage, and follow up.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">{f.icon}</span>
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
          <div className="relative h-80 overflow-hidden rounded-3xl shadow-md lg:h-[460px]">
            <Image src="/image3.jpeg" alt="Busy African trade expo floor" fill className="object-cover" sizes="50vw" />
          </div>
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-sky-600">Before you arrive</p>
            <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">The expo doesn't end when the doors close.</h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-slate-500">
              Start engaging before you arrive and keep the value long after the event. Tandaza lets you request meetings, browse product catalogues, and follow up with exhibitors, all from your phone.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Browse exhibitor profiles and product catalogues before the expo",
                "Show interest in exhibitors and specific products ahead of time",
                "Request meetings with exhibitors before or during the event",
                "Submit pre-order intent for products you want to follow up on",
                "Save favourites and receive reminders so you never miss an expo",
                "Access exhibitor content and connections even after the expo ends",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(199,89%,48%) 0%, hsl(210,100%,56%) 100%)" }}>
              Create free account
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-6 py-20 text-center lg:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Your next expo is waiting.</h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-slate-500">Visitor registration is always free. Find your next expo across 12 African markets.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(199,89%,48%) 0%, hsl(210,100%,56%) 100%)" }}>
              Register free
            </Link>
            <Link href="/for/exhibitors"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">
              Are you an exhibitor?
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
