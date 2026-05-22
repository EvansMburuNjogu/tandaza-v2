import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { LandingNav } from "@/components/marketing/landing-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Tandaza: Africa's Expo Management Platform",
  description:
    "Tandaza is the end-to-end digital platform powering trade exhibitions across Africa. Manage organizers, exhibitors, sponsors, and visitors from one unified system.",
  keywords: ["expo management Africa", "trade show platform", "exhibition management", "African expo software"],
  openGraph: {
    title: "Tandaza: Africa's Expo Management Platform",
    description: "The end-to-end digital platform powering trade exhibitions across Africa.",
    type: "website",
    locale: "en_ZA",
    siteName: "Tandaza",
  },
  twitter: { card: "summary_large_image", title: "Tandaza: Africa's Expo Management Platform", description: "The end-to-end digital platform powering trade exhibitions across Africa." },
  alternates: { canonical: "https://tandaza.com" },
}

/* Image catalogue — all local African expo photography */
const I = {
  i2:  "/image2.jpeg",   // overhead expo floor — hero
  i3:  "/image3.jpeg",   // Agro Asia Tractor — busy African expo floor
  i4:  "/image4.jpeg",   // BuildExpo Africa outdoor entrance
  i5:  "/image5.jpeg",   // Made in Africa Expo — professional activation
  i6:  "/image6.jpeg",   // Africa Lounge — clean corporate exhibitors
  i7:  "/image7.jpeg",   // Nigeria Construction Week — dark industrial
  i8:  "/image8.webp",   // Uganda at international expo — colorful
  i9:  "/image9.jpeg",   // South Africa NCB — red carpet professional
  i10: "/image10.jpeg",  // Hype Energy — vibrant dark networking
  i11: "/image11.jpeg",  // Zambia High Commission — handshake moment
  i12: "/image12.jpeg",  // Standard Bank activation — corporate sponsor
  i13: "/image13.webp",  // Ibero-Africa Agri Expo — grand hall
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <main>
        <HeroSection />
        <GallerySection />
        <PlatformSection />
        <CapabilitiesSection />
        <RolesSection />
        <StatsSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}


/* ══ 1. HERO — dark full-bleed ═══════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-noise" style={{ minHeight: "100svh" }} aria-label="Hero">
      {/* Full-bleed image */}
      <div className="absolute inset-0">
        <Image src={I.i2} alt="Overhead view of a busy African trade expo floor" fill priority
          className="object-cover object-center" sizes="100vw" />
        {/* Multi-layer dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />
        {/* Indigo tint layer */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(49,46,129,0.55) 0%, transparent 60%)" }} />
      </div>

      {/* Topo pattern over image */}
      <div className="pointer-events-none absolute inset-0 bg-topo opacity-60" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-[1200px] min-h-[100svh] flex-col justify-center px-6 py-32 lg:px-8">
        <div className="max-w-[680px]">
          <h1 className="text-[2.6rem] font-bold leading-[1.02] tracking-[-0.035em] text-white sm:text-[4.5rem] lg:text-[5.4rem]">
            Powering Africa's<br />
            <span style={{ background: "linear-gradient(110deg, #a5b4fc 0%, #c084fc 50%, #818cf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              expo economy.
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-[1.05rem] leading-[1.85] text-slate-300/85">
            The only platform built end-to-end for African trade exhibitions,
            connecting organizers, exhibitors, sponsors, and visitors from listing to settlement.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/register"
              className="inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_40px_hsl(234,79%,61%,0.5)]"
              style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", boxShadow: "0 4px 24px hsl(234,79%,61%,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              Start managing expos
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-8 py-4 text-[15px] font-semibold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/[0.14]">
              Sign in
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/10 pt-10 sm:flex sm:flex-wrap sm:gap-10">
            {[["400+", "Expos hosted"], ["12", "Countries active"], ["80K+", "Platform users"], ["98%", "Organizer retention"]].map(([n, l]) => (
              <div key={l}>
                <p className="text-[2rem] font-bold tabular-nums leading-none text-white">{n}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  )
}

/* ══ 2. LOGO BAR ════════════════════════════════════════════════ */


/* ══ 3. GALLERY — real expo photography ════════════════════════ */

function GallerySection() {
  const photos = [
    { src: I.i3,  alt: "African trade expo floor — Agro Asia Tractor showcase", aspect: "tall" },
    { src: I.i9,  alt: "South Africa National Convention Bureau at an international expo", aspect: "wide" },
    { src: I.i8,  alt: "Uganda pavilion at an international trade expo", aspect: "wide" },
    { src: I.i4,  alt: "BuildExpo Africa outdoor entrance with forklifts and banners", aspect: "normal" },
    { src: I.i11, alt: "Zambia High Commission handshake at trade expo", aspect: "normal" },
    { src: I.i10, alt: "Hype Energy vibrant activation — networking at African expo", aspect: "tall" },
    { src: I.i7,  alt: "Nigeria Construction Week — Ebara West Africa showcase", aspect: "normal" },
    { src: I.i12, alt: "Standard Bank corporate sponsor activation", aspect: "normal" },
  ]

  return (
    <section className="relative overflow-hidden bg-slate-50 py-20">
      <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">From the floor</p>
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] text-slate-900 sm:text-[2.5rem]">
              Real African expo.<br />
              <span className="text-slate-400">Real results.</span>
            </h2>
          </div>
          <Link href="/register"
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 sm:inline-flex">
            Get started
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Col 1 */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <GalleryCell src={photos[0].src} alt={photos[0].alt} h="h-64 sm:h-72" />
            <GalleryCell src={photos[3].src} alt={photos[3].alt} h="h-44 sm:h-52" />
          </div>
          {/* Col 2 */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <GalleryCell src={photos[1].src} alt={photos[1].alt} h="h-44 sm:h-52" />
            <GalleryCell src={photos[4].src} alt={photos[4].alt} h="h-64 sm:h-72" />
          </div>
          {/* Col 3 */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <GalleryCell src={photos[5].src} alt={photos[5].alt} h="h-56 sm:h-64" />
            <GalleryCell src={photos[6].src} alt={photos[6].alt} h="h-52 sm:h-60" />
          </div>
          {/* Col 4 */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <GalleryCell src={photos[2].src} alt={photos[2].alt} h="h-44 sm:h-48" />
            <GalleryCell src={photos[7].src} alt={photos[7].alt} h="h-52 sm:h-56" />
            {/* Stat chip */}
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <span className="text-[2rem] font-bold leading-none"
                style={{ background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                13+
              </span>
              <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Countries<br />represented
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GalleryCell({ src, alt, h }: { src: string; alt: string; h: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl ${h}`}>
      <Image src={src} alt={alt} fill
        className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.06]"
        sizes="(max-width:640px) 50vw, 25vw" />
      <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:bg-black/10" />
    </div>
  )
}

/* ══ 4. PLATFORM ════════════════════════════════════════════════ */

function PlatformSection() {
  return (
    <section id="platform" className="relative overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8">

      <div className="relative mx-auto max-w-[1200px]">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">The platform</p>
          <h2 className="text-[2.2rem] font-bold leading-[1.1] tracking-[-0.03em] text-slate-900 sm:text-[2.8rem]">
            Built for the energy<br />of the exhibition floor.
          </h2>
          <p className="mt-4 text-[15.5px] leading-[1.8] text-slate-500">
            Tandaza is engineered around how African expos actually run, around the live foot traffic,
            the on-floor deals, the sponsor activations. Every feature earns its place.
          </p>
        </div>

        {/* 12-col asymmetric image grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4" style={{ minHeight: "480px" }}>
          {/* Main large image */}
          <div className="group relative overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(99,102,241,0.15)] sm:col-span-7 sm:row-span-2" style={{ minHeight: "420px" }}>
            <Image src={I.i3} alt="Busy African trade expo floor" fill
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width:640px) 100vw, 58vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/90 px-4 py-2.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-slate-800">Exhibition floor · live</p>
                <p className="text-[10px] text-slate-500">400+ exhibitors tracked</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl shadow-md sm:col-span-5" style={{ minHeight: "210px" }}>
            <Image src={I.i6} alt="Clean corporate expo exhibitors — Africa Lounge" fill
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width:640px) 100vw, 42vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
            <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-800 backdrop-blur-sm">
              Exhibitor management
            </span>
          </div>

          <div className="group relative overflow-hidden rounded-3xl shadow-md sm:col-span-5" style={{ minHeight: "210px" }}>
            <Image src={I.i5} alt="Professional Made in Africa Expo activation" fill
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width:640px) 100vw, 42vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
            <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-800 backdrop-blur-sm">
              Exhibitor portal
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ══ 5. CAPABILITIES ════════════════════════════════════════════ */

const CAPS = [
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M14.5 11v6M11.5 14h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    label: "Expo lifecycle",
    title: "End-to-end expo management",
    body: "Create, publish, and run expos from one dashboard. Exhibitor onboarding, visitor registrations, and schedules. No spreadsheets needed.",
    img: I.i9,
    imgAlt: "South Africa National Convention Bureau at a professional expo",
    stat: { n: "60%", l: "Less admin time" },
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    label: "Payments & revenue",
    title: "Automated financial settlement",
    body: "Exhibitors pay through the platform, sponsors settle invoices, and your commission is reconciled automatically. Full financial transparency with one-click payouts.",
    img: I.i12,
    imgAlt: "Standard Bank corporate sponsor an activation at an African expo",
    stat: { n: "3×", l: "Faster settlements" },
  },
  {
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14M3 10l4-4M3 10l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 10l-4-4M17 10l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Real-time insights",
    title: "Live analytics for every stakeholder",
    body: "Attendance tracking, revenue dashboards, exhibitor performance, and engagement metrics, updated in real time across every role on the platform.",
    img: I.i8,
    imgAlt: "Uganda pavilion packed with visitors at international expo",
    stat: { n: "98%", l: "Uptime SLA" },
  },
]

function CapabilitiesSection() {
  return (
    <section id="features" className="relative bg-slate-50 px-6 py-24 sm:py-32 lg:px-8">
      <div className="relative mx-auto max-w-[1200px]">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Capabilities</p>
          <h2 className="text-[2.2rem] font-bold tracking-[-0.03em] text-slate-900 sm:text-[2.6rem]">
            Everything an expo needs.<br />
            <span className="text-slate-400">Nothing it doesn't.</span>
          </h2>
        </div>

        <div className="space-y-4">
          {CAPS.map((c, i) => (
            <article key={c.title}
              className={`group grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 ${i % 2 === 1 ? "sm:[direction:rtl]" : ""}`}
            >
              <div className="relative h-64 overflow-hidden sm:h-auto sm:[direction:ltr]">
                <Image src={c.img} alt={c.imgAlt} fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width:640px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              <div className="flex flex-col justify-center gap-5 p-8 sm:[direction:ltr] lg:p-12">
                <span className="inline-flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                    style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)" }}>
                    {c.icon}
                  </span>
                  {c.label}
                </span>
                <h3 className="text-[1.45rem] font-bold leading-snug tracking-[-0.025em] text-slate-900">{c.title}</h3>
                <p className="text-[14.5px] leading-[1.75] text-slate-500">{c.body}</p>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5">
                  <span className="text-[1.8rem] font-bold tabular-nums leading-none"
                    style={{ background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {c.stat.n}
                  </span>
                  <span className="text-sm font-medium text-slate-500">{c.stat.l}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { t: "12-country support", b: "Operate across multiple African markets with per-country localisation and settings." },
            { t: "Role-based portals", b: "Purpose-built interfaces for organizers, exhibitors, visitors, and sponsors." },
            { t: "Commission tracking", b: "Tandaza tracks exhibitor payments and credits your commission automatically after each transaction." },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-sm font-bold tracking-tight text-slate-900">{c.t}</h4>
              <p className="mt-2 text-sm leading-[1.7] text-slate-500">{c.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══ 6. ROLES ═══════════════════════════════════════════════════ */

const ROLES = [
  {
    slug: "organizers",
    title: "Organizers",
    headline: "Partner with us. Earn on every exhibitor.",
    body: "We power your expo as an add-on to your existing operation. Your exhibitors use Tandaza to organise themselves, and you earn commission on every transaction through the platform.",
    img: I.i4,
    imgAlt: "BuildExpo Africa outdoor entrance with exhibitors arriving",
    cta: "Run your expo",
    accent: { border: "border-indigo-200", bg: "#f5f3ff", dot: "bg-indigo-500", labelDark: "text-indigo-600", ctaClass: "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50" },
  },
  {
    slug: "exhibitors",
    title: "Exhibitors",
    headline: "Showcase your brand. Capture real leads.",
    body: "Browse upcoming expos, apply for exhibitor access, manage your product catalogue, and track every visitor interaction. Measurable ROI from every show.",
    img: I.i5,
    imgAlt: "Professional expo activation — Made in Africa Expo Canada",
    cta: "Exhibit smarter",
    accent: { border: "border-emerald-200", bg: "#f0fdf4", dot: "bg-emerald-500", labelDark: "text-emerald-700", ctaClass: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50" },
  },
  {
    slug: "visitors",
    title: "Visitors",
    headline: "Find expos worth the journey.",
    body: "Discover upcoming trade exhibitions, pre-register, browse exhibitors by category, and plan your visit before you arrive. One app for every show.",
    img: I.i8,
    imgAlt: "Crowds of visitors at Uganda pavilion international expo",
    cta: "Explore expos",
    accent: { border: "border-sky-200", bg: "#f0f9ff", dot: "bg-sky-500", labelDark: "text-sky-700", ctaClass: "border-sky-200 bg-white text-sky-700 hover:bg-sky-50" },
  },
  {
    slug: "sponsors",
    title: "Sponsors",
    headline: "Reach the audience that drives decisions.",
    body: "Activate sponsorship packages, run targeted ads across expos, and track brand impressions and engagement with precision reporting.",
    img: I.i12,
    imgAlt: "Standard Bank corporate sponsor activation activation",
    cta: "Activate sponsorship",
    accent: { border: "border-amber-200", bg: "#fffbeb", dot: "bg-amber-500", labelDark: "text-amber-700", ctaClass: "border-amber-200 bg-white text-amber-700 hover:bg-amber-50" },
  },
]

function RolesSection() {
  return (
    <section id="roles" className="relative overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8">

      <div className="relative mx-auto max-w-[1200px]">

        {/* Header */}
        <div className="mb-16 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-500">Who it's for</p>
            <h2 className="text-[2.4rem] font-bold leading-[1.05] tracking-[-0.03em] text-slate-900 sm:text-[3rem]">
              One platform.<br />Every stakeholder covered.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.75] text-slate-500 lg:text-right">
            Whether you're running the show or attending it. Tandaza has a purpose-built workspace for your role.
          </p>
        </div>

        {/* 4 role cards — 2-col grid, tall image left + content right */}
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <article key={r.slug}
              className={`group relative flex overflow-hidden rounded-3xl border-2 ${r.accent.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(0,0,0,0.10)]`}
              style={{ background: r.accent.bg }}
            >
              {/* Left — tall portrait image */}
              <div className="relative w-[140px] shrink-0 sm:w-[160px]">
                <Image src={r.img} alt={r.imgAlt} fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.06]"
                  sizes="160px" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
              </div>

              {/* Right — content */}
              <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${r.accent.dot}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${r.accent.labelDark}`}>{r.title}</span>
                  </div>
                  <h3 className="text-[1rem] font-bold leading-snug tracking-tight text-slate-900">{r.headline}</h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-slate-500">{r.body}</p>
                </div>
                <Link href="/register"
                  className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl border px-4 py-2 text-[12.5px] font-semibold transition-all group-hover:gap-2.5 ${r.accent.ctaClass}`}>
                  {r.cta}
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom image band */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[I.i3, I.i9, I.i13].map((src, i) => (
            <div key={i} className="relative h-36 overflow-hidden rounded-2xl sm:h-44">
              <Image src={src} alt="African expo" fill className="object-cover object-center" sizes="33vw" />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══ 7. STATS ═══════════════════════════════════════════════════ */

function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-slate-900 px-6 py-24 lg:px-8">

      <div className="relative mx-auto max-w-[1200px]">
        <p className="mb-12 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
          Platform scale
        </p>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {[
            { n: "400+", l: "Expos hosted", sub: "Across 12 countries" },
            { n: "80K+", l: "Registered users", sub: "All stakeholder types" },
            { n: "96%", l: "Uptime SLA", sub: "Enterprise-grade reliability" },
            { n: "3×", l: "Faster settlements", sub: "vs manual reconciliation" },
          ].map(({ n, l, sub }) => (
            <div key={l} className="flex flex-col gap-1 text-center">
              <span className="text-[2.8rem] font-bold tabular-nums leading-none sm:text-[3.2rem]"
                style={{ background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {n}
              </span>
              <span className="mt-2 text-[13.5px] font-semibold text-white">{l}</span>
              <span className="text-[11px] text-slate-600">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══ 8. CTA ═════════════════════════════════════════════════════ */

function CtaSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
          <div className="grid lg:grid-cols-2">
            {/* Left — image */}
            <div className="relative h-64 lg:h-auto">
              <Image src={I.i11} alt="Business handshake at African trade expo" fill
                className="object-cover object-center" sizes="50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-900/40" />
            </div>

            {/* Right — content */}
            <div className="flex flex-col justify-center gap-6 bg-slate-950 px-8 py-12 lg:px-12 lg:py-16">
              <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-indigo-400" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">Start for free today</span>
              </div>

              <h2 className="text-[2.2rem] font-bold leading-[1.06] tracking-[-0.035em] text-white sm:text-[2.8rem]">
                Your next expo<br />starts right here.
              </h2>
              <p className="text-[15px] leading-[1.8] text-slate-400">
                Join thousands of organizers, exhibitors, and sponsors already running their trade exhibitions on Tandaza across 12 African markets.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/register"
                  className="inline-flex items-center gap-2.5 rounded-2xl px-7 py-4 text-[15px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, hsl(234,79%,61%) 0%, hsl(262,79%,64%) 100%)", boxShadow: "0 4px 24px hsl(234,79%,61%,0.35)" }}>
                  Get started free
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/pricing"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-7 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.10]">
                  View pricing
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/[0.07] pt-6">
                {[["No credit card", "Free to start"], ["12 countries", "Active now"], ["80K+ users", "Already onboard"]].map(([t, s]) => (
                  <div key={t}>
                    <p className="text-[13px] font-bold text-white">{t}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

