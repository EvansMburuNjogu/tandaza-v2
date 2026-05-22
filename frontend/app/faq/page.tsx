import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "FAQ — Tandaza",
  description: "Answers to the most common questions about Tandaza, pricing, payments, supported countries, and how the platform works.",
  alternates: { canonical: "https://tandaza.com/faq" },
}

const SECTIONS = [
  {
    title: "Getting started",
    faqs: [
      {
        q: "What is Tandaza?",
        a: "Tandaza is an end-to-end expo management platform built for African trade exhibitions. It covers the full event lifecycle: exhibitor applications, visitor registration, payment collection, sponsor management, and post-event analytics.",
      },
      {
        q: "Who is Tandaza for?",
        a: "Tandaza serves four stakeholder groups: expo organisers who partner with us to power their events, exhibitors who pay to use the platform to organise themselves and capture leads, visitors who attend, and sponsors who activate brand campaigns.",
      },
      {
        q: "How do I create an account?",
        a: "Click Get Started or Register on any page. You select your role during onboarding. Organisers can start creating expos immediately on the free tier.",
      },
      {
        q: "Is Tandaza only for large expos?",
        a: "No. Tandaza is designed to scale from small pilot events with 10 exhibitors to large national trade fairs with thousands of attendees. Contact us to discuss the right setup for your event size.",
      },
    ],
  },
  {
    title: "Pricing and payments",
    faqs: [
      {
        q: "How does pricing work?",
        a: "Tandaza charges a flat fee per expo you create, not a monthly subscription. The fee is based on your event size and requirements. Contact us for a quote.",
      },
      {
        q: "What is the platform fee?",
        a: "Exhibitors pay a fee to use Tandaza for their expo participation. A portion of that fee is paid out as commission to the organiser. The exact split is agreed per partnership arrangement.",
      },
      {
        q: "Are there any hidden charges?",
        a: "No. The per-expo fee and platform fee on payments are the only charges. There are no setup fees, monthly minimums, or feature unlock fees.",
      },
      {
        q: "How are settlements paid out?",
        a: "After each expo, exhibitor payments are reconciled and organiser commissions are settled to the partner's registered bank account. Settlements are available within 2 to 5 business days depending on the country.",
      },
      {
        q: "Which payment methods are supported?",
        a: "Tandaza supports Paystack, M-Pesa, Flutterwave, and card payments (Visa, Mastercard). Availability varies by country.",
      },
      {
        q: "Can I charge visitors for entry?",
        a: "Yes. Visitor registration can be free or ticketed. If you charge entry, the payment is processed through the platform the same way exhibitor fees are.",
      },
    ],
  },
  {
    title: "Expos and features",
    faqs: [
      {
        q: "Can exhibitors apply to my expo through the platform?",
        a: "Yes. You can create a custom application form and publish it. Exhibitors apply through the Tandaza portal, upload any required documents, and you review and approve or reject applications from your dashboard.",
      },
      {
        q: "How does visitor check-in work?",
        a: "Registered visitors receive a QR code badge by email. At the venue, your team scans the QR code using the Tandaza mobile app or a USB scanner. Check-in data feeds into your live attendance analytics.",
      },
      {
        q: "Can I run multiple expos at the same time?",
        a: "Yes. You can run multiple active expos at the same time. The number of concurrent expos is agreed as part of your pricing arrangement.",
      },
      {
        q: "Is there a mobile app for visitors?",
        a: "Yes. Visitors can use the Tandaza app on iOS and Android to browse the exhibitor directory, scan exhibitor QR codes, and save contact cards.",
      },
    ],
  },
  {
    title: "Countries and support",
    faqs: [
      {
        q: "Which countries does Tandaza support?",
        a: "Tandaza currently operates in Kenya, Nigeria, South Africa, Ghana, Tanzania, Rwanda, Uganda, Zambia, Zimbabwe, Cote d'Ivoire, Cameroon, and Ethiopia. More countries are being added regularly.",
      },
      {
        q: "What languages is the platform available in?",
        a: "Tandaza is currently available in English. French and Swahili support is on the roadmap.",
      },
      {
        q: "How do I get support?",
        a: "All tiers include email support. Standard includes priority support with faster response times. Professional includes dedicated support with a named contact. You can reach us through the Help section in your dashboard.",
      },
      {
        q: "Is my data secure?",
        a: "Yes. Tandaza uses TLS encryption for all data in transit, AES-256 encryption at rest, and complies with applicable data protection regulations in each market. See our Privacy Policy for full details.",
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-20 text-center lg:px-8 lg:py-28">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Help centre</p>
          <h1 className="text-[2.8rem] font-bold tracking-[-0.035em] text-white sm:text-[3.6rem]">
            Frequently asked<br />
            <span style={{ background: "linear-gradient(110deg, #a5b4fc 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              questions
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[1rem] leading-[1.8] text-slate-400">
            Everything you need to know about how Tandaza works.
          </p>
        </div>
      </div>

      {/* FAQ sections */}
      <div className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-[800px] space-y-16">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="mb-6 text-[1.2rem] font-bold tracking-tight text-slate-900">{s.title}</h2>
              <div className="space-y-3">
                {s.faqs.map((f) => (
                  <div key={f.q} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                    <h3 className="text-[14.5px] font-bold text-slate-900">{f.q}</h3>
                    <p className="mt-2 text-[13.5px] leading-[1.75] text-slate-500">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Still have questions */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-16 text-center lg:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="text-[1.6rem] font-bold tracking-tight text-slate-900">Still have questions?</h2>
          <p className="mt-3 text-[14px] leading-[1.7] text-slate-500">
            We are a small team and we read every message. Reach out and we will get back to you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Get in touch
            </Link>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-7 py-3.5 text-[14px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
              View pricing
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
