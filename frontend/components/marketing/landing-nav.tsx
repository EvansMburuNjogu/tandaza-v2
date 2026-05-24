"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const FOR_LINKS = [
  { label: "Organizers", href: "/for/organizers", desc: "Run your entire expo from one dashboard" },
  { label: "Exhibitors", href: "/for/exhibitors", desc: "Find expos, apply, and capture leads" },
  { label: "Visitors", href: "/for/visitors", desc: "Discover and plan your expo visits" },
  { label: "Sponsors", href: "/for/sponsors", desc: "Activate packages and track ROI" },
]

const NAV_LINKS = [
  ["Features", "/features"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
  ["Contact", "/contact"],
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [forOpen, setForOpen] = useState(false)
  const pathname = usePathname()
  const isDark = pathname === "/"

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    fn()
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  useEffect(() => {
    if (!forOpen) return
    const close = () => setForOpen(false)
    document.addEventListener("click", close, { once: true })
    return () => document.removeEventListener("click", close)
  }, [forOpen])

  const frosted = scrolled || !isDark
  const logoSrc = frosted ? "/tandaza-logo-v2.png" : "/tandaza-logo-white-v2.png"

  return (
    <header className={cn(
      "fixed inset-x-0 top-0 z-50 transition-all duration-500",
      frosted
        ? "border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur-xl"
        : "bg-transparent"
    )}>
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-6 lg:px-8">

        <Link href="/" className="-ml-3 flex items-center lg:-ml-5">
          <Image src={logoSrc} alt="Tandaza" width={224} height={84} className="h-[76px] w-[224px] object-contain" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Home */}
          <a href="/"
            className={cn(
              "rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
              frosted ? "text-slate-500 hover:text-slate-900" : "text-white/70 hover:text-white"
            )}>
            Home
          </a>

          {/* "For" dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setForOpen(v => !v) }}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
                frosted ? "text-slate-500 hover:text-slate-900" : "text-white/70 hover:text-white"
              )}>
              For
              <svg className={cn("h-3 w-3 transition-transform", forOpen ? "rotate-180" : "")} viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {forOpen && (
              <div className="animate-dropdown-in absolute left-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}>
                {FOR_LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setForOpen(false)}
                    className="flex flex-col px-4 py-3.5 transition-colors hover:bg-slate-50">
                    <span className="text-[13.5px] font-semibold text-slate-800">{l.label}</span>
                    <span className="text-[12px] text-slate-500">{l.desc}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-200",
                frosted ? "text-slate-500 hover:text-slate-900" : "text-white/70 hover:text-white"
              )}>
              {label}
            </a>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-4">
          <Link href="/login"
            className={cn(
              "hidden text-[13.5px] font-medium transition-colors sm:block",
              frosted ? "text-slate-500 hover:text-slate-900" : "text-white/70 hover:text-white"
            )}>
            Sign in
          </Link>
          <Link href="/register"
            className="hidden items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_4px_20px_hsl(234,79%,61%,0.35)] md:inline-flex"
            style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}
          >
            Get started
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2.5 7h9M8 3.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(v => !v)}
            className={cn("flex h-9 w-9 items-center justify-center md:hidden", frosted ? "text-slate-500 hover:text-slate-900" : "text-white/80 hover:text-white")}
            aria-label="Menu">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
              {open
                ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                : <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 md:hidden",
        open ? "max-h-[600px] border-t border-slate-100" : "max-h-0"
      )}>
        <div className="bg-white px-6 py-5 shadow-lg">
          <a href="/" onClick={() => setOpen(false)}
            className="mb-2 block rounded-xl px-4 py-2.5 text-[14px] font-semibold text-slate-900 hover:bg-slate-50">
            Home
          </a>
          <p className="mb-1.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">For</p>
          <div className="mb-2 space-y-0.5">
            {FOR_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </div>
          <div className="space-y-0.5 border-t border-slate-100 pt-2">
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-[14px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                {label}
              </a>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <Link href="/login" onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-[15px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-center text-[15px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
              Get started free
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
