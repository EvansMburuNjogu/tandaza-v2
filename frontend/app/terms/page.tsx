import type { Metadata } from "next"
import Link from "next/link"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Terms of Service — Tandaza",
  description: "The terms governing your use of the Tandaza expo management platform.",
  alternates: { canonical: "https://tandaza.com/terms" },
}

const LAST_UPDATED = "1 June 2026"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-16 lg:px-8 lg:py-20">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Legal</p>
          <h1 className="text-[2.4rem] font-bold tracking-[-0.03em] text-white">Terms of Service</h1>
          <p className="mt-3 text-[14px] text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-10 text-[14.5px] leading-[1.85] text-slate-600">

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">1. About these terms</h2>
            <p>These Terms of Service govern your access to and use of the Tandaza platform, operated by Maalim Group Limited ("Tandaza", "we", "us", "our"). By creating an account or using any part of the platform, you agree to be bound by these terms.</p>
            <p className="mt-3">If you are using Tandaza on behalf of an organisation, you represent that you have the authority to bind that organisation to these terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">2. Your account</h2>
            <ul className="space-y-2 pl-5">
              {[
                "You must provide accurate, current, and complete information when creating your account.",
                "You are responsible for maintaining the security of your account credentials.",
                "You must notify us immediately if you suspect unauthorised access to your account.",
                "You may not share your account with others or create accounts on behalf of third parties without their consent.",
                "You must be at least 18 years old to create an account.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">3. Use of the platform</h2>
            <p>You agree to use Tandaza only for lawful purposes and in accordance with these terms. You must not:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "Use the platform to conduct fraudulent or deceptive activities.",
                "Upload or distribute malicious code, viruses, or harmful software.",
                "Attempt to gain unauthorised access to any part of the platform or its underlying systems.",
                "Scrape, crawl, or extract data from the platform using automated means without our written permission.",
                "Violate any applicable law or regulation in your use of the platform.",
                "Harass, threaten, or harm other users of the platform.",
                "Post content that is defamatory, obscene, or infringes the intellectual property rights of others.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">4. Organiser responsibilities</h2>
            <p>If you use Tandaza as an expo organiser, you are responsible for:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "Ensuring that your expo complies with all applicable laws, venue regulations, and licensing requirements in the country where it takes place.",
                "Providing accurate and truthful information about your expo, including dates, location, and exhibitor terms.",
                "Honouring the terms you publish to exhibitors and visitors, including refund and cancellation policies.",
                "Ensuring that payments collected through the platform are used for their stated purpose.",
                "Obtaining any necessary consent from exhibitors and visitors to process their data.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">5. Payments and fees</h2>
            <p>Pricing for Tandaza services is set out on our <Link href="/pricing" className="font-medium text-indigo-600 hover:underline">Pricing page</Link>. By publishing an expo on a paid tier, you agree to pay the applicable per-expo fee.</p>
            <p className="mt-3">When payments are processed through the platform on your behalf, Tandaza deducts the applicable platform fee before settlement. Fees are non-refundable except where required by law or as stated in our refund policy.</p>
            <p className="mt-3">We reserve the right to update our pricing. We will notify you of changes at least 30 days before they take effect.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">6. Intellectual property</h2>
            <p>Tandaza and its original content, features, and functionality are owned by Maalim Group Limited and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the platform without our express written consent.</p>
            <p className="mt-3">You retain ownership of any content you upload to the platform, such as expo descriptions, floor plans, and product catalogues. By uploading content, you grant Tandaza a limited, non-exclusive licence to use, display, and process that content as necessary to provide the services.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">7. Third-party services</h2>
            <p>Tandaza integrates with third-party payment processors and other services. Your use of those services is subject to their own terms and privacy policies. Tandaza is not responsible for the practices of third-party service providers.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">8. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Tandaza shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the platform.</p>
            <p className="mt-3">Our total liability to you for any claim arising from these terms or your use of the platform shall not exceed the total fees you paid to Tandaza in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">9. Disclaimers</h2>
            <p>The platform is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of the platform. We do not guarantee that the platform will be error-free or uninterrupted.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">10. Termination</h2>
            <p>We may suspend or terminate your account if you breach these terms, engage in fraudulent activity, or fail to pay amounts due. You may close your account at any time from your account settings. On termination, your right to use the platform ceases immediately.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">11. Governing law</h2>
            <p>These terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi, Kenya, unless otherwise required by applicable law in your country.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">12. Changes to these terms</h2>
            <p>We may update these terms from time to time. We will notify you of material changes by email or by posting a notice in the platform at least 14 days before changes take effect. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">13. Contact</h2>
            <p>For any questions about these terms, contact us at <a href="mailto:legal@tandaza.com" className="font-medium text-indigo-600 hover:underline">legal@tandaza.com</a>.</p>
          </section>

        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
