import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Privacy Policy — Tandaza",
  description: "How Tandaza collects, uses, and protects your personal data.",
  alternates: { canonical: "https://tandaza.com/privacy" },
}

const LAST_UPDATED = "1 June 2026"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-16 lg:px-8 lg:py-20">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Legal</p>
          <h1 className="text-[2.4rem] font-bold tracking-[-0.03em] text-white">Privacy Policy</h1>
          <p className="mt-3 text-[14px] text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-10 text-[14.5px] leading-[1.85] text-slate-600">

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">1. Who we are</h2>
            <p>Tandaza is an expo management platform developed and operated by Maalim Group Limited, a company registered in Kenya. When this policy refers to "Tandaza", "we", "us", or "our", it means Maalim Group Limited and the Tandaza platform.</p>
            <p className="mt-3">Contact: <a href="mailto:privacy@tandaza.com" className="font-medium text-indigo-600 hover:underline">privacy@tandaza.com</a></p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">2. Data we collect</h2>
            <p>We collect data you provide directly and data generated when you use the platform.</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "Account information: name, email address, phone number, and organisation name when you register.",
                "Profile data: role-specific information such as company details for exhibitors, expo details for organisers, and brand information for sponsors.",
                "Payment information: when you pay or receive payments through the platform, we collect the necessary details. Full card numbers are handled by our payment processors and are not stored on our servers.",
                "Usage data: pages visited, features used, actions taken, device and browser information, and IP address.",
                "Communications: messages you send through the platform or to our support team.",
                "Event data: expo listings, floor plans, exhibitor applications, visitor registrations, and analytics generated from events run on the platform.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">3. How we use your data</h2>
            <ul className="space-y-2 pl-5">
              {[
                "To provide, operate, and improve the Tandaza platform.",
                "To process payments and manage financial settlements.",
                "To send transactional emails such as registration confirmations, application updates, and payment receipts.",
                "To send product updates and announcements where you have opted in.",
                "To respond to support requests.",
                "To detect and prevent fraud and abuse.",
                "To comply with legal obligations applicable in our operating markets.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">4. Legal basis for processing</h2>
            <p>We process your personal data on the following legal bases:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "Contract performance: processing necessary to deliver the services you have signed up for.",
                "Legitimate interests: improving the platform, preventing fraud, and communicating relevant product updates.",
                "Legal obligation: complying with applicable laws and regulations in the countries where we operate.",
                "Consent: where we explicitly ask for your consent, such as for marketing communications.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">5. Data sharing</h2>
            <p>We do not sell your personal data. We share data only in the following circumstances:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "With payment processors (such as Paystack, Flutterwave, and M-Pesa) to handle transactions.",
                "With cloud infrastructure providers that host our platform, under data processing agreements.",
                "With other platform users where required by the service, for example, sharing exhibitor information with the organiser of an expo you have applied to.",
                "With law enforcement or regulators where we are legally required to do so.",
                "With a successor entity in the event of a merger, acquisition, or sale of assets.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">6. Data retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymise your personal data within 90 days, except where we are required to retain it for legal or regulatory reasons.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">7. Security</h2>
            <p>We use industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest, regular security assessments, and access controls. No system is perfectly secure, and we cannot guarantee the absolute security of your data.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">8. Your rights</h2>
            <p>Depending on your country, you may have rights including:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "Access: request a copy of the personal data we hold about you.",
                "Correction: ask us to correct inaccurate or incomplete data.",
                "Deletion: request that we delete your personal data.",
                "Portability: receive your data in a structured, machine-readable format.",
                "Objection: object to certain types of processing.",
                "Withdrawal of consent: where processing is based on consent, you may withdraw it at any time.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:privacy@tandaza.com" className="font-medium text-indigo-600 hover:underline">privacy@tandaza.com</a>.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">9. Cookies</h2>
            <p>We use strictly necessary cookies to keep you logged in and maintain session state. We also use analytics cookies to understand how the platform is used. You can control cookie settings in your browser, though disabling certain cookies may affect platform functionality.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">10. Changes to this policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes by email or by posting a notice in the platform. Continued use of Tandaza after changes take effect constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">11. Contact us</h2>
            <p>For privacy-related queries, contact us at <a href="mailto:privacy@tandaza.com" className="font-medium text-indigo-600 hover:underline">privacy@tandaza.com</a> or through the <Link href="/register" className="font-medium text-indigo-600 hover:underline">contact form</Link> on our website.</p>
          </section>

        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
