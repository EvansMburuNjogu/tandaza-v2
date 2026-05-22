import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"
import { IconTicket, IconBarChart, IconPhone, IconLock, IconGlobe, IconCreditCard, IconClipboard, IconBell, IconUsers, IconCalendar } from "@/components/marketing/icons"

export const metadata: Metadata = {
  title: "Pricing — Tandaza",
  description: "Per-expo pricing for expo organizers across Africa. Pay only for the expos you run, not a monthly subscription.",
  alternates: { canonical: "https://tandaza.com/pricing" },
}

const INCLUDED = [
  { icon: <IconClipboard />, label: "Applications" },
  { icon: <IconTicket />, label: "Visitor reg." },
  { icon: <IconBarChart />, label: "Analytics" },
  { icon: <IconPhone />, label: "Mobile app" },
  { icon: <IconLock />, label: "SSL security" },
  { icon: <IconGlobe />, label: "Multi-country" },
  { icon: <IconCreditCard />, label: "Payments" },
  { icon: <IconClipboard />, label: "Applications" },
  { icon: <IconBell />, label: "Notifications" },
  { icon: <IconUsers />, label: "All roles" },
]

const FAQS = [
  {
    q: "How does per-expo pricing work?",
    a: "You pay a flat fee for each expo you create on Tandaza, based on your event size and requirements. There are no monthly subscriptions. If you run 3 expos a year, you pay 3 times.",
  },
  {
    q: "What is the platform fee on payments?",
    a: "When exhibitors or visitors pay through Tandaza, we charge a small platform fee that covers payment processing and automatic settlement to your account. The exact rate is agreed when you set up your expo.",
  },
  {
    q: "Is there a setup fee?",
    a: "No. There are no setup fees, onboarding fees, or hidden charges.",
  },
  {
    q: "Is there a trial or pilot option?",
    a: "Contact us to discuss a pilot arrangement for your first expo. We work with first-time organisers to find a setup that fits their scale.",
  },
  {
    q: "Do exhibitors and visitors pay to use Tandaza?",
    a: "Exhibitors pay their platform fees through the platform, which is set by you as the organiser. Visitor registration is always free for visitors.",
  },
  {
    q: "Which countries are supported?",
    a: "Tandaza currently operates across 12 African markets including Kenya, Nigeria, South Africa, Ghana, Tanzania, Rwanda, Uganda, Zambia, Zimbabwe, Cote d'Ivoire, Cameroon, and Ethiopia.",
  },
  {
    q: "What if I need a custom setup for a large event?",
    a: "Contact us for enterprise pricing. We offer custom contracts, white-label portals, dedicated account management, and SLA-backed uptime for large or multi-country operations.",
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="pointer-events-none absolute inset-0 bg-topo opacity-60" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-20 text-center lg:px-8 lg:py-28">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Pricing</p>
          <h1 className="text-[2.8rem] font-bold tracking-[-0.035em] text-white sm:text-[3.6rem]">
            Pay per expo.<br />
            <span style={{ background: "linear-gradient(110deg, #a5b4fc 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Not per month.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-[1.8] text-slate-400">
            No subscriptions. No surprises. Pricing is based on your expo size and requirements. Get in touch and we will put together the right package for you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", boxShadow: "0 4px 20px hsl(234,79%,61%,0.35)" }}>
              Get a quote
            </Link>
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-8 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.14]">
              Create account
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">How it works</p>
          <h2 className="mb-12 text-center text-[2rem] font-bold tracking-tight text-slate-900">Simple, transparent pricing</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Tell us about your expo",
                body: "Share the expected number of exhibitors, visitors, and the country you are operating in.",
              },
              {
                step: "02",
                title: "We prepare a quote",
                body: "We send you a flat per-expo price based on your event size. No hidden fees or monthly billing.",
              },
              {
                step: "03",
                title: "Run your expo",
                body: "Pay once per expo. Use the full platform: exhibitor management, registrations, payments, analytics, and more.",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-7">
                <span className="text-[2rem] font-bold tabular-nums leading-none"
                  style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {s.step}
                </span>
                <h3 className="text-[15px] font-bold text-slate-900">{s.title}</h3>
                <p className="text-[13px] leading-[1.65] text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Included in every expo */}
      <div className="border-y border-slate-100 bg-slate-50 px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-8 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
            Included in every expo
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {INCLUDED.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{f.icon}</span>
                <span className="text-[12px] font-semibold text-slate-600">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[720px] overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 px-8 py-10 text-center shadow-sm sm:px-12 sm:py-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Get a quote</p>
          <h2 className="mt-3 text-[1.8rem] font-bold tracking-tight text-slate-900">Ready to run your expo on Tandaza?</h2>
          <p className="mx-auto mt-4 max-w-sm text-[14px] leading-[1.75] text-slate-500">
            Tell us about your event and we will come back with a clear per-expo price within one business day.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Contact us
            </Link>
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-8 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
              Create free account
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[12px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-indigo-400" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              No monthly fees
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-indigo-400" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              No setup fees
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-indigo-400" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Pay per expo only
            </span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[720px]">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">FAQ</p>
          <h2 className="mb-12 text-center text-[2rem] font-bold tracking-[-0.03em] text-slate-900">
            Common questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-[14.5px] font-bold text-slate-900">{f.q}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.7] text-slate-500">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[13px] text-slate-400">
            More questions?{" "}
            <Link href="/faq" className="font-semibold text-indigo-600 hover:text-indigo-700">Visit our full FAQ</Link>
            {" "}or{" "}
            <Link href="/contact" className="font-semibold text-indigo-600 hover:text-indigo-700">get in touch</Link>.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
