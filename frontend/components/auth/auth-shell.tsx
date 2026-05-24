"use client"

import Image from "next/image"
import Link from "next/link"
import { ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  eyebrow?: string
  title?: string
  description?: string
  children: ReactNode
  panelTitle?: string
  panelDescription?: string
  panelKicker?: string
  cardClassName?: string
  footer?: ReactNode
  compact?: boolean
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  panelTitle = "One platform. Every expo role.",
  panelKicker = "Africa's expo digital platform",
  cardClassName,
  footer,
  compact = false
}: AuthShellProps) {
  const hasHeading = eyebrow || title || description

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <BrandPanel title={panelTitle} kicker={panelKicker} />

        <section className="relative flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
          <FormBackground />

          <div className={cn("relative w-full", compact ? "max-w-[420px]" : "max-w-[480px]")}>
            <MobileBrand />

            <div className={cn(
              "rounded-2xl border border-border/50 bg-card/80 shadow-shell backdrop-blur-xl",
              cardClassName
            )}>
              {hasHeading && (
                <div className="p-7 sm:p-9">
                  <AuthHeading eyebrow={eyebrow!} title={title!} description={description!} />
                  <div className="mt-8">{children}</div>
                </div>
              )}
              {!hasHeading && children}
            </div>

            {footer ? <div className="mt-4">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function FormBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft top-center glow */}
      <div
        className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.14) 0%, transparent 70%)" }}
      />
      {/* Bottom-right accent */}
      <div
        className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.12) 0%, transparent 70%)" }}
      />
      {/* Fine dot grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
    </div>
  )
}

function BrandPanel({ title, kicker }: { title: string; kicker: string }) {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:flex-col">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(160deg, #06050f 0%, #130d35 35%, #1d1250 55%, #0e0826 100%)"
        }}
      />

      {/* Mesh colour blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-32 top-1/4 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 65%)", filter: "blur(1px)" }}
        />
        <div
          className="absolute -right-20 top-0 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 65%)" }}
        />
      </div>

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "30px 30px"
        }}
      />

      {/* Abstract decorative rings */}
      <DecorativeRings />

      {/* Content */}
      <div className="relative flex min-h-screen flex-col px-10 py-10 xl:px-14">
        {/* Logo */}
        <Link
          href="/login"
          className="flex w-fit items-center rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <Image src="/tandaza-logo-white.png" alt="Tandaza" width={176} height={96} className="h-[96px] w-[176px] object-contain" priority />
        </Link>

        {/* Centred headline */}
        <div className="my-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-300/80">{kicker}</p>
          <h1 className="mt-4 max-w-xs text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-[260px] text-sm leading-7 text-indigo-200/60">
            Visitors, exhibitors, organizers, sponsors — one secure door.
          </p>

          {/* Role cards */}
          <div className="mt-8 grid grid-cols-2 gap-2.5">
            {[
              {
                label: "Visitor",
                sub: "Browse & discover expos",
                icon: (
                  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
                    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2.5 16c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                label: "Exhibitor",
                sub: "Manage leads and products",
                icon: (
                  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
                    <rect x="2" y="8" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="7" y="5" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="12" y="2" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                )
              },
              {
                label: "Organizer",
                sub: "Run & oversee your expo",
                icon: (
                  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
                    <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2 7h14" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6 2v2M12 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M5.5 11h7M5.5 13.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                label: "Sponsor",
                sub: "Amplify brand reach",
                icon: (
                  <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M9 2l1.854 3.756L15 6.528l-3 2.924.708 4.128L9 11.5l-3.708 2.08L6 9.452 3 6.528l4.146-.772L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                )
              }
            ].map(({ label, sub, icon }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]"
              >
                {/* Subtle inner glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle at 30% 30%, rgba(165,180,252,0.12), transparent 70%)" }} />
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/20">
                  {icon}
                </span>
                <p className="mt-2.5 text-[13px] font-semibold text-white">{label}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-300/60">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom wordmark */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
          Tandaza &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}

function DecorativeRings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Large outer ring */}
      <svg
        className="absolute -right-32 top-1/2 -translate-y-1/2 opacity-[0.12]"
        width="600" height="600" viewBox="0 0 600 600" fill="none"
        aria-hidden
      >
        <circle cx="300" cy="300" r="280" stroke="white" strokeWidth="1" />
        <circle cx="300" cy="300" r="210" stroke="white" strokeWidth="0.8" />
        <circle cx="300" cy="300" r="140" stroke="white" strokeWidth="0.6" />
        <circle cx="300" cy="300" r="70" stroke="white" strokeWidth="0.5" />
        {/* Cross lines */}
        <line x1="20" y1="300" x2="580" y2="300" stroke="white" strokeWidth="0.4" />
        <line x1="300" y1="20" x2="300" y2="580" stroke="white" strokeWidth="0.4" />
        <line x1="102" y1="102" x2="498" y2="498" stroke="white" strokeWidth="0.3" />
        <line x1="498" y1="102" x2="102" y2="498" stroke="white" strokeWidth="0.3" />
        {/* Tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180
          const x1 = 300 + 275 * Math.cos(angle)
          const y1 = 300 + 275 * Math.sin(angle)
          const x2 = 300 + 265 * Math.cos(angle)
          const y2 = 300 + 265 * Math.sin(angle)
          return (
            <line
              key={i}
              x1={x1.toFixed(3)}
              y1={y1.toFixed(3)}
              x2={x2.toFixed(3)}
              y2={y2.toFixed(3)}
              stroke="white"
              strokeWidth="0.8"
            />
          )
        })}
      </svg>

      {/* Small accent ring top-left */}
      <svg
        className="absolute -left-16 -top-16 opacity-[0.08]"
        width="280" height="280" viewBox="0 0 280 280" fill="none"
        aria-hidden
      >
        <circle cx="140" cy="140" r="130" stroke="white" strokeWidth="0.8" />
        <circle cx="140" cy="140" r="90" stroke="white" strokeWidth="0.5" />
        <circle cx="140" cy="140" r="50" stroke="white" strokeWidth="0.4" />
      </svg>

      {/* Glowing dot cluster */}
      <svg
        className="absolute bottom-24 right-16 opacity-30"
        width="160" height="160" viewBox="0 0 160 160" fill="none"
        aria-hidden
      >
        {[
          [80, 80, 3], [80, 44, 2], [80, 116, 2],
          [44, 80, 2], [116, 80, 2],
          [55, 55, 1.5], [105, 55, 1.5],
          [55, 105, 1.5], [105, 105, 1.5]
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(199,210,254,0.8)" />
        ))}
        <line x1="80" y1="44" x2="80" y2="116" stroke="rgba(199,210,254,0.25)" strokeWidth="0.5" />
        <line x1="44" y1="80" x2="116" y2="80" stroke="rgba(199,210,254,0.25)" strokeWidth="0.5" />
        <line x1="55" y1="55" x2="105" y2="105" stroke="rgba(199,210,254,0.2)" strokeWidth="0.5" />
        <line x1="105" y1="55" x2="55" y2="105" stroke="rgba(199,210,254,0.2)" strokeWidth="0.5" />
      </svg>
    </div>
  )
}

function MobileBrand() {
  return (
    <Link
      href="/login"
      className="mb-7 flex w-fit items-center rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 lg:hidden"
    >
      <Image src="/tandaza-logo.png" alt="Tandaza" width={152} height={72} className="h-[72px] w-[152px] object-contain" priority />
    </Link>
  )
}

export function AuthHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <span className="inline-block rounded-full border border-primary/20 bg-primary/8 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-3.5 text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-[13px] leading-6 text-slate-500">{description}</p>
    </div>
  )
}

export function AuthField({
  label, htmlFor, children, action
}: {
  label: string; htmlFor: string; children: ReactNode; action?: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-foreground">{label}</label>
        {action}
      </div>
      {children}
    </div>
  )
}

export function AuthSubmitContent({
  loading, loadingLabel, label
}: {
  loading: boolean; loadingLabel: string; label: string
}) {
  if (!loading) return <>{label}</>
  return (
    <span className="flex items-center gap-2">
      <Spinner className="h-4 w-4" />
      {loadingLabel}
    </span>
  )
}

export function AuthSecondaryLink({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-elevated/50 px-4 py-3.5 text-center text-[13px] text-slate-500 backdrop-blur-sm">
      {children}
    </div>
  )
}

export function AuthStatusCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-elevated/70 p-4 text-sm leading-6 text-slate-600">
      {children}
    </div>
  )
}
