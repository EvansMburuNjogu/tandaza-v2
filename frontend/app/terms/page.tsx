import type { Metadata } from "next"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Terms and Conditions — Tandaza",
  description: "The terms and conditions governing your use of Tandaza for expo discovery, management, engagement, payments, and analytics.",
  alternates: { canonical: "https://tandaza.africa/terms" },
}

const LAST_UPDATED = "24 May 2026"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 pt-[68px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div className="relative mx-auto max-w-[1200px] px-6 py-16 lg:px-8 lg:py-20">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-400">Legal</p>
          <h1 className="text-[2.4rem] font-bold tracking-[-0.03em] text-white">Terms and Conditions</h1>
          <p className="mt-3 text-[14px] text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-10 text-[14.5px] leading-[1.85] text-slate-600">

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">1. About these terms</h2>
            <p>These Terms and Conditions govern your access to and use of the Tandaza platform, including expo discovery, exhibitor workspaces, visitor engagement, digital booth activation, sponsorship tools, payments, notifications, analytics, and related services. By creating an account or using any part of the platform, you agree to be bound by these terms.</p>
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
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">4. Organizer, exhibitor, sponsor, and visitor responsibilities</h2>
            <p>Each user is responsible for using Tandaza honestly and for keeping the information they provide accurate. In particular:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                "Organizers must ensure their expos comply with applicable laws, venue rules, and published terms.",
                "Exhibitors must provide accurate company, product, pricing, document, livestream, meeting, and advertising information.",
                "Sponsors must ensure campaigns, ads, and brand materials are lawful and do not mislead visitors.",
                "Visitors must use expo engagement tools respectfully and must not submit false meeting, feedback, chat, or pre-order information.",
                "All users must obtain any permissions needed before uploading files, images, videos, logos, or personal data.",
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
            <p>Tandaza pricing may vary by country, currency, expo, user role, digital booth activation, sponsor plan, add-on, ad placement, and agreed commercial arrangement. By using a paid feature, you agree to pay the applicable amount shown or agreed before purchase.</p>
            <p className="mt-3">Payments may be processed by third-party payment providers. Tandaza may record payment attempts, provider responses, receipts, commissions, processing fees, and settlements for audit and reconciliation. Fees are non-refundable except where required by law or expressly approved by Tandaza.</p>
            <p className="mt-3">We may update pricing, payment methods, and settlement rules as the platform evolves. Where changes materially affect an active paid arrangement, we will provide reasonable notice.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">6. Intellectual property</h2>
            <p>Tandaza and its original content, features, designs, workflows, and functionality are protected by applicable intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the platform without our express written consent.</p>
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
            <p>These terms are governed by the laws of Kenya, unless mandatory laws in another country apply. Any disputes shall be resolved in the courts of Nairobi, Kenya, unless otherwise required by applicable law.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">12. Changes to these terms</h2>
            <p>We may update these terms from time to time. We will notify you of material changes by email or by posting a notice in the platform at least 14 days before changes take effect. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-[1.1rem] font-bold text-slate-900">13. Contact</h2>
            <p>For any questions about these terms, contact us at <a href="mailto:hello@tandaza.africa" className="font-medium text-indigo-600 hover:underline">hello@tandaza.africa</a> or call <a href="tel:+254799010210" className="font-medium text-indigo-600 hover:underline">+254 799 010 210</a>.</p>
          </section>

        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
