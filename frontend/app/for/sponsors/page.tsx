import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"
import { IconTarget, IconPackage, IconBarChart, IconDocument, IconCreditCard, IconGlobe, IconBell, IconTrendUp } from "@/components/marketing/icons"

export const metadata: Metadata = {
  title: "For Sponsors : Tandaza",
  description: "Buy measurable visibility across African trade expos. Create campaigns, upload ad creatives, track impressions and clicks, and prove ROI with Tandaza's sponsor portal.",
  alternates: { canonical: "https://tandaza.com/for/sponsors" },
}

const FEATURES = [
  { icon: <IconTarget />, title: "Sponsor plans and placements", body: "View available sponsorship plans and country or expo-specific opportunities. Choose the reach that fits your brand goals." },
  { icon: <IconPackage />, title: "Campaign and ad creation", body: "Create sponsor campaigns, build individual ads, upload banner media, and preview your creative before it goes live." },
  { icon: <IconCreditCard />, title: "Secure payment", body: "Pay for sponsor plans or individual ad placements directly through the platform. View receipts and payment history any time." },
  { icon: <IconBarChart />, title: "Impression and click tracking", body: "Monitor impressions, clicks, and engagement across every active campaign and placement in real time." },
  { icon: <IconGlobe />, title: "Country and expo reach", body: "View campaign performance broken down by country and expo. Understand exactly where your brand attention is coming from." },
  { icon: <IconDocument />, title: "Sponsor reports", body: "Access detailed campaign reports showing reach, engagement rates, and performance by expo or country." },
]

export default function SponsorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="absolute inset-0">
          <Image src="/image10.jpeg" alt="Hype Energy vibrant sponsor activation at African expo" fill priority
            className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 py-28 lg:px-8 lg:py-36">
          <div className="max-w-[620px]">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400">For sponsors</p>
            <h1 className="text-[3rem] font-bold leading-[1.04] tracking-[-0.035em] text-white sm:text-[4rem]">
              Reach the audience<br />
              <span style={{ background: "linear-gradient(110deg, #fde68a 0%, #fbbf24 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                that drives decisions.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[1rem] leading-[1.8] text-slate-300">
              Activate sponsorship packages across Africa's leading trade expos. Track brand impressions, engage decision-makers, and receive ROI reports that justify every dollar.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(38,92%,50%) 0%, hsl(45,93%,47%) 100%)", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}>
                Activate sponsorship
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.14]">
                View packages
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="border-b border-slate-100 bg-white px-6 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-6 sm:grid-cols-4">
          {[["80K+", "Visitors reached"], ["400+", "Expos to sponsor"], ["12", "Countries"], ["3×", "Avg. engagement lift"]].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-[2rem] font-bold tabular-nums leading-none"
                style={{ background: "linear-gradient(135deg, hsl(38,92%,50%) 0%, hsl(45,93%,47%) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-600">Sponsor tools</p>
            <h2 className="text-[2.2rem] font-bold tracking-tight text-slate-900">Measurable visibility across every expo.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">{f.icon}</span>
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
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-600">Prove your ROI</p>
            <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Buy visibility. Track every impression.</h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-slate-500">
              Every campaign on Tandaza is tracked from the moment it goes live. Monitor impressions and clicks in real time, view performance by country and expo, and access campaign reports that prove the value of every spend.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "View available plans and country or expo-specific opportunities",
                "Create campaigns, build ads, and upload creative media",
                "Preview ad creative before it goes live",
                "Track impressions, clicks, and engagement in real time",
                "View campaign performance broken down by country and expo",
                "Receive notifications when campaigns are approved or payments processed",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(38,92%,50%) 0%, hsl(45,93%,47%) 100%)" }}>
              Get started
            </Link>
          </div>
          <div className="relative h-80 overflow-hidden rounded-3xl shadow-md lg:h-[460px]">
            <Image src="/image12.jpeg" alt="Standard Bank corporate sponsor activation" fill className="object-cover" sizes="50vw" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-6 py-20 text-center lg:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Ready to activate?</h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-slate-500">Talk to our team about sponsorship packages tailored to your brand goals.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(38,92%,50%) 0%, hsl(45,93%,47%) 100%)" }}>
              Create sponsor account
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-amber-200 hover:text-amber-700">
              View packages
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
