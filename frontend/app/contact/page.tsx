import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Contact — Tandaza",
  description: "Get in touch with the Tandaza team. We're here to help expo organizers, exhibitors, sponsors, and visitors across Africa.",
  alternates: { canonical: "https://tandaza.com/contact" },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-20 text-center lg:px-8 lg:py-28">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Contact</p>
          <h1 className="text-[2.8rem] font-bold tracking-[-0.035em] text-white sm:text-[3.6rem]">
            Get in touch
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-[1.8] text-slate-400">
            Have a question about Tandaza? We would love to hear from you. Reach us directly using any of the channels below.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className="bg-slate-50 px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-[800px] gap-4 sm:gap-6 sm:grid-cols-2">

          {/* Phone */}
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Phone</p>
              <a href="tel:+254799010210"
                className="mt-1 block text-[1.4rem] font-bold tracking-tight text-slate-900 transition-colors hover:text-indigo-600">
                +254 799 010 210
              </a>
              <p className="mt-1.5 text-[13px] text-slate-500">Available Mon to Fri, 8am to 6pm EAT</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Email</p>
              <a href="mailto:info@tandaza.africa"
                className="mt-1 block text-[1.4rem] font-bold tracking-tight text-slate-900 transition-colors hover:text-indigo-600">
                info@tandaza.africa
              </a>
              <p className="mt-1.5 text-[13px] text-slate-500">We reply within one business day</p>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mx-auto mt-8 max-w-[800px] rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Headquarters</p>
              <p className="mt-2 text-[14px] font-semibold text-slate-800">Nairobi, Kenya</p>
              <p className="mt-1 text-[13px] text-slate-500">East Africa</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Operated by</p>
              <a href="https://maalimgroup.co.ke" target="_blank" rel="noopener noreferrer"
                className="mt-2 block text-[14px] font-semibold text-slate-800 transition-colors hover:text-indigo-600">
                Maalim Group Limited
              </a>
              <p className="mt-1 text-[13px] text-slate-500">Nairobi, Kenya</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Markets served</p>
              <p className="mt-2 text-[14px] font-semibold text-slate-800">12 African countries</p>
              <p className="mt-1 text-[13px] text-slate-500">
                <Link href="/about" className="text-indigo-600 hover:underline">Learn more</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white px-6 py-16 text-center lg:px-8">
        <div className="mx-auto max-w-md">
          <h2 className="text-[1.8rem] font-bold tracking-tight text-slate-900">Ready to get started?</h2>
          <p className="mt-3 text-[15px] leading-[1.75] text-slate-500">Create a free account and explore Tandaza for your next expo.</p>
          <div className="mt-6">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Create free account
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
