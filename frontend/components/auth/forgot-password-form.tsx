"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useState } from "react"
import { toast } from "sonner"
import { forgotPassword } from "@/lib/auth/client-api"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/auth/auth-shell"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await forgotPassword({ email })
      setSent(true)
      toast.success("Reset email sent", { description: response.message })
    } catch (error) {
      const description = error instanceof Error ? error.message : "Could not start password reset."
      toast.error("Reset failed", { description })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell compact cardClassName="p-0 overflow-hidden">
      {/* Shimmer top border */}
      <div
        className="h-[3px] w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 40%, hsl(var(--accent)) 70%, transparent 100%)"
        }}
      />

      <div className="px-7 pb-8 pt-7 sm:px-9 sm:pb-9 sm:pt-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Password recovery</p>
            <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
              Reset password
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              We&apos;ll send a secure link to your email.
            </p>
          </div>
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
            <Image src="/tandaza-logo.svg" alt="Tandaza" width={24} height={24} priority />
          </span>
        </div>

        <div className="my-7 h-px w-full bg-border/50" />

        {sent ? (
          /* Success state */
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <MailSentIcon />
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">Check your inbox</p>
            <p className="mt-2 max-w-[280px] text-[13px] leading-6 text-slate-500">
              We sent a reset link to <span className="font-semibold text-foreground">{email}</span>. The link expires in 30 minutes.
            </p>
            <div className="mt-6 h-px w-full bg-border/50" />
            <Link
              href="/login"
              className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-primary transition hover:underline"
            >
              <BackArrowIcon />
              Back to sign in
            </Link>
          </div>
        ) : (
          /* Form */
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-semibold text-foreground">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-border bg-elevated py-3 pl-10 pr-4 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                  boxShadow: "0 4px 18px hsl(var(--primary)/0.32)"
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span>Sending link…</span>
                  </>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <ArrowIcon />
                  </>
                )}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-center">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-primary"
              >
                <BackArrowIcon />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  )
}

/* ── Icons ── */

function MailIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden>
      <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M1.5 5.5l7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MailSentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-primary" aria-hidden>
      <rect x="2" y="4.5" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
