import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="bg-slate-900">
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-14 lg:px-8">
        <div className="grid gap-8 border-b border-white/10 pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center">
              <Image src="/tandaza-logo-white-v2.png" alt="Tandaza" width={200} height={82} className="h-[82px] w-[200px] object-contain" />
            </Link>
            <p className="mt-4 max-w-[260px] text-[13px] leading-[1.7] text-slate-400">
              Africa's expo management platform, connecting every stakeholder from listing to settlement.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["🇰🇪", "🇳🇬", "🇿🇦", "🇬🇭", "🇹🇿", "🇷🇼", "🇺🇬", "🇿🇲"].map((flag) => (
                <span key={flag} className="rounded-md bg-white/10 px-2 py-1 text-[14px]">{flag}</span>
              ))}
              <span className="flex items-center rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-400">+4 more</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">For</p>
            <div className="space-y-3">
              {[
                ["Organizers", "/for/organizers"],
                ["Exhibitors", "/for/exhibitors"],
                ["Visitors", "/for/visitors"],
                ["Sponsors", "/for/sponsors"],
              ].map(([l, h]) => (
                <a key={l} href={h} className="block text-[13px] font-medium text-slate-400 transition-colors hover:text-white">{l}</a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Company</p>
            <div className="space-y-3">
              {[
                ["About", "/about"],
                ["Features", "/features"],
                ["Pricing", "/pricing"],
                ["Contact", "/contact"],
              ].map(([l, h]) => (
                <a key={l} href={h} className="block text-[13px] font-medium text-slate-400 transition-colors hover:text-white">{l}</a>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Account</p>
            <div className="space-y-3">
              {[["Sign in", "/login"], ["Register", "/register"]].map(([l, h]) => (
                <a key={l} href={h} className="block text-[13px] font-medium text-slate-400 transition-colors hover:text-white">{l}</a>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/register"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
                Get started free
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 pt-8 lg:flex-row lg:items-center">
          <p className="text-[12px] text-slate-500">© {new Date().getFullYear()} Tandaza. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="text-[12px] text-slate-500 transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="text-[12px] text-slate-500 transition-colors hover:text-white">Terms and Conditions</Link>
            <a href="https://maalimgroup.co.ke" target="_blank" rel="noopener noreferrer"
              className="text-[12px] text-slate-500 transition-colors hover:text-white">
              Developed and Maintained by Maalim Group Limited
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
