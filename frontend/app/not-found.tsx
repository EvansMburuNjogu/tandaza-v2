import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark" />
      <div className="pointer-events-none absolute inset-0 bg-topo opacity-60" />

      <div className="relative z-10 flex flex-col items-center">
        <Link href="/" className="mb-10 flex items-center">
          <Image src="/tandaza-logo-white.png" alt="Tandaza" width={72} height={72} className="h-[72px] w-[72px] object-contain" />
        </Link>

        {/* 404 number */}
        <p className="text-[7rem] font-bold leading-none tabular-nums sm:text-[10rem]"
          style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          404
        </p>

        <h1 className="mt-4 text-[1.6rem] font-bold tracking-tight text-white sm:text-[2rem]">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-[1.75] text-slate-400">
          The page you are looking for does not exist or has been moved. Head back to the homepage and find what you need.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/"
            className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[14px] font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to homepage
          </Link>
          <Link href="/contact"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-7 py-3.5 text-[14px] font-semibold text-white transition hover:bg-white/[0.12]">
            Contact support
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-500">
          {[
            ["Features", "/features"],
            ["Pricing", "/pricing"],
            ["About", "/about"],
            ["Sign in", "/login"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-slate-300">
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
