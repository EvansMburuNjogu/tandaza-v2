"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { resetPassword } from "@/lib/auth/client-api"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/auth/auth-shell"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      toast.error("Invalid reset link", { description: "Please use the reset link from your email." })
      return
    }
    if (password.length < 8) {
      toast.error("Could not reset password", { description: "Password must be at least 8 characters." })
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match", { description: "Confirm your new password and try again." })
      return
    }
    setLoading(true)
    try {
      await resetPassword({ token, newPassword: password })
      toast.success("Password updated", { description: "You can now sign in with your new password." })
      router.replace("/login")
    } catch (error) {
      toast.error("Could not reset password", {
        description: error instanceof Error ? error.message : "Check your reset link and try again."
      })
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
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">New password</p>
            <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
              Choose a password
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Pick something strong — at least 8 characters.
            </p>
          </div>
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
            <Image src="/tandaza-logo.png" alt="Tandaza" width={24} height={24} priority />
          </span>
        </div>

        <div className="my-7 h-px w-full bg-border/50" />

        <form className="space-y-4" onSubmit={onSubmit} noValidate aria-busy={loading}>
          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[13px] font-semibold text-foreground">
              New password <span className="text-primary" aria-hidden>*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                aria-required="true"
                aria-describedby="password-hint"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls + " pr-11"}
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

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-foreground">
              Confirm password <span className="text-primary" aria-hidden>*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <LockIcon />
              </span>
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                aria-required="true"
                aria-describedby="password-hint"
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className={inputCls + " pr-11"}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-3.5 flex items-center rounded-md text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <p id="password-hint" className="-mt-1 text-xs leading-5 text-slate-500">
            Use at least 8 characters. You can sign in after the password is updated.
          </p>

          {/* Strength hint */}
          {password.length > 0 && (
            <PasswordStrength password={password} />
          )}

          {/* CTA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                boxShadow: "0 4px 18px hsl(var(--primary)/0.32)"
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Updating password…</span>
                </>
              ) : (
                <>
                  <span>Update password</span>
                  <ArrowIcon />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center pt-1">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-slate-500 transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <BackArrowIcon />
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}

/* ── Password strength indicator ── */

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ]
  const score = checks.filter(Boolean).length
  const levels = [
    { label: "Weak", color: "bg-danger" },
    { label: "Fair", color: "bg-warning" },
    { label: "Good", color: "bg-success/70" },
    { label: "Strong", color: "bg-success" }
  ]
  const level = levels[score - 1] ?? levels[0]

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? level.color : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-[11px] text-slate-400" aria-live="polite">
        Strength: <span className="font-semibold text-foreground">{level.label}</span>
      </p>
    </div>
  )
}

/* ── Shared input class ── */
const inputCls =
  "w-full rounded-xl border border-border bg-elevated py-3 pl-10 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"

/* ── Icons ── */

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

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
