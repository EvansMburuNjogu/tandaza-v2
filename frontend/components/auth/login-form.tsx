"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { login } from "@/lib/auth/client-api"
import { getRedirectForRole } from "@/lib/auth/redirects"
import { httpOnlySessionToken } from "@/lib/auth/session-token"
import { Role } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/auth/auth-shell"
import { GoogleAuthButton } from "@/components/auth/google-auth-button"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next")
  const registerHref = nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"
  const { hydrated, user, setSession } = useSessionStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  function safeRedirectForRole(role: Role, fallback: string) {
    const roleHome = getRedirectForRole(role)
    return nextPath?.startsWith(roleHome) ? nextPath : fallback
  }

  function mustChangeAdminPassword(role: Role, mustChangePassword?: boolean) {
    return Boolean(mustChangePassword && (role === "administrator" || role === "super_administrator"))
  }

  useEffect(() => {
    if (!hydrated || !user) return
    if (mustChangeAdminPassword(user.role, user.mustChangePassword)) {
      router.replace(`/change-password?next=${encodeURIComponent(getRedirectForRole(user.role))}`)
      return
    }
    router.replace(safeRedirectForRole(user.role, getRedirectForRole(user.role)))
  }, [hydrated, nextPath, router, user])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      toast.error("Could not sign in", { description: "Enter your email address." })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Could not sign in", { description: "Enter a valid email address." })
      return
    }
    if (!password) {
      toast.error("Could not sign in", { description: "Enter your password." })
      return
    }
    setLoading(true)
    try {
      const response = await login({ email: trimmedEmail, password })
      setSession({ token: httpOnlySessionToken, user: response.user })
      toast.success("Signed in", { description: "Welcome back to Tandaza." })
      if (mustChangeAdminPassword(response.user.role, response.user.mustChangePassword)) {
        router.replace(`/change-password?next=${encodeURIComponent(getRedirectForRole(response.user.role))}`)
        return
      }
      router.replace(safeRedirectForRole(response.user.role, response.redirectTo))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid email or password."
      toast.error("Could not sign in", { description: message })
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
        {/* Card header — brand + heading */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Sign in</p>
            <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Sign in to continue to your Tandaza account.
            </p>
          </div>

          <Image src="/tandaza-logo.png" alt="Tandaza" width={60} height={60} className="h-[60px] w-[60px] flex-shrink-0 object-contain" priority />
        </div>

        {/* Divider */}
        <div className="my-7 h-px w-full bg-border/50" />

        <GoogleAuthButton nextPath={nextPath || undefined} />

        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-border/50" />
          <span className="mx-3 text-[11px] font-medium text-slate-400">or use email</span>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={onSubmit} noValidate aria-busy={loading}>
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13px] font-semibold text-foreground">
              Email address <span className="text-primary" aria-hidden>*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <MailIcon />
              </span>
              <input
                id="email"
                type="email"
                required
                aria-required="true"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-border bg-elevated py-3 pl-10 pr-4 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[13px] font-semibold text-foreground">
                Password <span className="text-primary" aria-hidden>*</span>
              </label>
              <Link
                href="/forgot-password"
                className="rounded-md text-[11px] font-semibold text-primary/80 transition hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                aria-required="true"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-border bg-elevated py-3 pl-10 pr-11 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3.5 flex items-center rounded-md text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-[14px] font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                boxShadow: "0 4px 18px hsl(var(--primary)/0.32)"
              }}
            >
              {/* Subtle inner shimmer */}
              <span className="pointer-events-none absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />

              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowIcon />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Divider + register */}
        <div className="mt-7">
          <div className="relative flex items-center">
            <div className="h-px flex-1 bg-border/50" />
            <span className="mx-3 text-[11px] font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="mt-4 text-center text-[13px] text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href={registerHref} className="font-semibold text-primary transition hover:underline">
              Create a visitor account
            </Link>
          </div>
        </div>

        {/* Trust badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400/70">
          <ShieldIcon />
          <span>Secured with 256-bit SSL encryption</span>
        </div>

        {/* Back to homepage */}
        <div className="mt-4 text-center">
          <Link href="/" className="inline-flex items-center gap-1 rounded-md text-[11px] text-slate-400 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden>
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to homepage
          </Link>
        </div>
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

function LockIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden>
      <rect x="2.5" y="8" width="13" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M5.5 8V5.5a3.5 3.5 0 017 0V8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="9" cy="12.25" r="1.25" fill="currentColor" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M1.5 9S4 4 9 4s7.5 5 7.5 5S14 14 9 14 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M1.5 9S4 4 9 4s7.5 5 7.5 5S14 14 9 14 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 2.5l13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 flex-shrink-0" aria-hidden>
      <path d="M8 1.5L2.5 4v4c0 3 2.5 5.5 5.5 6 3-0.5 5.5-3 5.5-6V4L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.5 8l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
