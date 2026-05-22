import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "About — Tandaza",
  description: "Tandaza is an early-stage startup building the management platform for Africa's expo economy, founded in 2026 by Evans Mburu.",
  alternates: { canonical: "https://tandaza.com/about" },
}

const VALUES = [
  {
    title: "Africa-first",
    body: "We build for how African expos actually work. Cash-heavy markets, unreliable connectivity, multi-language audiences. Not an afterthought, but the foundation.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Earned trust",
    body: "We earn organizer trust by doing exactly what we say: on uptime, on settlements, on support. Every feature ships with a reliability commitment, not just a launch date.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V7l-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Floor-level thinking",
    body: "We design with context from real expo floors, not from a spreadsheet. We have watched organisers scramble 20 minutes before opening and we build to prevent that.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Simple by design",
    body: "Expo management is complex. Our job is to make it feel simple. Every screen earns its existence. We cut features that create noise and double down on the ones that save hours.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="pointer-events-none absolute inset-0 bg-topo opacity-60" />

        <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:px-8 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-indigo-400" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Early stage startup</span>
              </div>
              <h1 className="text-[2.8rem] font-bold leading-[1.05] tracking-[-0.035em] text-white sm:text-[3.6rem]">
                We are building for<br />
                <span style={{ background: "linear-gradient(110deg, #a5b4fc 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Africa's expo floor.
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-[1rem] leading-[1.85] text-slate-400">
                Tandaza was born from a simple frustration: running a trade expo in Africa required
                juggling multiple disconnected tools, none of which understood the market.
                We decided to build the one that does.
              </p>
            </div>

            {/* Stats block */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: "2026", l: "Founded", sub: "Nairobi, Kenya" },
                { n: "12", l: "Countries", sub: "Target markets" },
                { n: "Early", l: "Stage", sub: "Growing fast" },
                { n: "1", l: "Founder", sub: "Evans Mburu" },
              ].map(({ n, l, sub }) => (
                <div key={l} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5 backdrop-blur-sm">
                  <p className="text-[2rem] font-bold leading-none"
                    style={{ background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {n}
                  </p>
                  <p className="mt-2 text-[13px] font-bold text-white">{l}</p>
                  <p className="text-[11px] text-slate-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Story */}
      <div className="bg-white px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[800px]">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Our story</p>
          <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Started in 2026 by Evans Mburu</h2>
          <div className="mt-6 space-y-5 text-[15px] leading-[1.85] text-slate-500">
            <p>
              Tandaza was founded in 2026 by Evans Mburu after seeing first-hand how difficult it was to manage trade expos in Africa using tools built for other markets. Organizers were stuck between WhatsApp groups, spreadsheets, and generic event software that did not understand on-the-ground realities.
            </p>
            <p>
              The vision was clear: build a single platform that handles every part of the expo lifecycle, from exhibitor applications and floor plans through to payment collection and post-event analytics, and make it work reliably across Africa's 12 largest exhibition markets.
            </p>
            <p>
              We are an early-stage startup. We move fast, we listen closely to organizers, and we are building in public. If you are running an expo in Africa, we would love to talk.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Get started free
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-7 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
              View pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Mission</p>
          <blockquote className="text-[1.8rem] font-bold leading-[1.25] tracking-[-0.025em] text-slate-900 sm:text-[2.2rem]">
            To build the infrastructure that powers Africa's expo economy, so that every organizer can run a world-class event and every exhibitor can find their next buyer.
          </blockquote>
          <p className="mt-5 text-[14px] text-slate-400">Evans Mburu, Founder</p>
        </div>
      </div>

      {/* Values */}
      <div className="bg-white px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">What we believe</p>
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-slate-900 sm:text-[2.4rem]">Our values</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                  style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
                  {v.icon}
                </span>
                <h3 className="mt-4 text-[1rem] font-bold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.7] text-slate-500">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Founder */}
      <div className="bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[700px]">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Founder</p>
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-slate-900">The person building it</h2>
          </div>
          <div className="flex items-start gap-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              EM
            </span>
            <div>
              <p className="text-[16px] font-bold text-slate-900">Evans Mburu</p>
              <p className="text-[13px] font-medium text-indigo-600">Founder</p>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-slate-500">
                Building Tandaza to solve the real challenges facing expo organisers across Africa. Previously worked across product, technology, and operations in the East African tech ecosystem.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Photo band */}
      <div className="relative overflow-hidden bg-slate-900 py-16">
        <div className="relative flex gap-4 overflow-hidden px-6">
          {["/image3.jpeg", "/image9.jpeg", "/image4.jpeg", "/image7.jpeg", "/image13.webp"].map((src, i) => (
            <div key={i} className="relative h-48 w-64 shrink-0 overflow-hidden rounded-2xl sm:h-56 sm:w-80">
              <Image src={src} alt="African expo" fill className="object-cover object-center" sizes="320px" />
              <div className="absolute inset-0 bg-black/25" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative bg-slate-950 px-6 py-20 text-center lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-topo opacity-50" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-[2rem] font-bold tracking-tight text-white sm:text-[2.4rem]">
            Join us in building Africa's expo economy.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-slate-400">
            Whether you are an organizer, exhibitor, sponsor, or visitor, there is a place for you on Tandaza.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", boxShadow: "0 4px 24px hsl(234,79%,61%,0.4)" }}>
              Get started free
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-8 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.1]">
              View pricing
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
