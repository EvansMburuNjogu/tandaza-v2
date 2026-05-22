import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"
import { IconCalendar, IconClipboard, IconCreditCard, IconTicket, IconBarChart, IconHandshake } from "@/components/marketing/icons"

export const metadata: Metadata = {
  title: "For Organizers : Tandaza",
  description: "Partner with Tandaza to power your expo. Your exhibitors self-organise on the platform, you earn commission on every transaction, and we handle the tools.",
  alternates: { canonical: "https://tandaza.com/for/organizers" },
}

const FEATURES = [
  { icon: <IconHandshake />, title: "Partnership model", body: "We join your expo as a technology partner. No setup fees for you. Exhibitors use Tandaza and you earn commission on their activity." },
  { icon: <IconClipboard />, title: "Exhibitor self-service", body: "Your exhibitors onboard themselves: applications, profiles, product catalogues, and lead capture. All without admin work from your team." },
  { icon: <IconCreditCard />, title: "Commission payouts", body: "Tandaza processes exhibitor payments and credits your commission automatically. Full settlement reports after every expo." },
  { icon: <IconTicket />, title: "Visitor registration", body: "Branded registration portals with QR badge generation and on-site check-in scanning, included as part of the partnership." },
  { icon: <IconBarChart />, title: "Live analytics", body: "Real-time attendance, exhibitor engagement, and revenue dashboards. Your data, always visible." },
  { icon: <IconCalendar />, title: "Expo scheduling", body: "Publish your expo with sessions, timelines, and conference programmes. Keep exhibitors and visitors in sync automatically." },
]

export default function OrganizersPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="absolute inset-0">
          <Image src="/image4.jpeg" alt="BuildExpo Africa outdoor expo entrance" fill priority
            className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-6 py-28 lg:px-8 lg:py-36">
          <div className="max-w-[620px]">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">For organizers</p>
            <h1 className="text-[3rem] font-bold leading-[1.04] tracking-[-0.035em] text-white sm:text-[4rem]">
              Partner with us.<br />
              <span style={{ background: "linear-gradient(110deg, #a5b4fc 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Earn on every exhibitor.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[1rem] leading-[1.8] text-slate-300">
              Tandaza plugs into your existing expo as an add-on. Your exhibitors use the platform to organise themselves, and you earn commission on every transaction. No extra work, no extra cost.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register"
                className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", boxShadow: "0 4px 20px hsl(234,79%,61%,0.4)" }}>
                Become a partner
              </Link>
              <Link href="/contact"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-7 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.14]">
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-b border-slate-100 bg-white px-6 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-6 sm:grid-cols-4">
          {[["400+", "Expos partnered"], ["12", "Countries"], ["Commission", "On every transaction"], ["98%", "Partner retention"]].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-[2rem] font-bold tabular-nums leading-none"
                style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">What you get</p>
            <h2 className="text-[2.2rem] font-bold tracking-tight text-slate-900">Everything your exhibitors need. Revenue for you.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{f.icon}</span>
                <h3 className="text-[14.5px] font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo + feature detail */}
      <section className="bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2">
          <div className="relative h-80 overflow-hidden rounded-3xl shadow-md lg:h-[460px]">
            <Image src="/image9.jpeg" alt="Professional expo floor with organized exhibitors" fill className="object-cover" sizes="50vw" />
          </div>
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">How it works</p>
            <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">You run the expo. We handle the tools.</h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-slate-500">
              Tandaza plugs into your existing expo operation. Your exhibitors get a powerful self-service platform, your visitors get a smooth registration experience, and you earn commission on every exhibitor transaction. With zero extra overhead.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Exhibitors self-onboard, apply, and manage their own profiles",
                "You review applications and approve exhibitors in one click",
                "Commission is tracked and paid out automatically",
                "Visitor registration and badges are handled by the platform",
                "Post-event reports delivered to you and your exhibitors",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Get started free
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-6 py-20 text-center lg:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="text-[2rem] font-bold tracking-tight text-slate-900">Ready to partner with Tandaza?</h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-slate-500">Get in touch and we will walk you through how the partnership works for your expo.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Contact us
            </Link>
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-[15px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
