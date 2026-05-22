"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { changePassword } from "@/lib/auth/client-api"
import { getRedirectForRole } from "@/lib/auth/redirects"
import { httpOnlySessionToken } from "@/lib/auth/session-token"
import { useSessionStore } from "@/store/session-store"
import { Spinner } from "@/components/ui/spinner"
import { AuthShell } from "@/components/auth/auth-shell"

export function ChangePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, setSession } = useSessionStore()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 8) {
      toast.error("Check the password", { description: "New password must be at least 8 characters." })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", { description: "Confirm password must match the new password." })
      return
    }
    setLoading(true)
    try {
      const response = await changePassword({ currentPassword, newPassword, confirmPassword })
      if (response.user) {
        setSession({ token: httpOnlySessionToken, user: response.user })
      }
      toast.success("Password changed", { description: "Your admin account is now ready." })
      const fallback = response.user
        ? getRedirectForRole(response.user.role)
        : user
        ? getRedirectForRole(user.role)
        : "/administrator"
      const next = searchParams.get("next")
      router.replace(next?.startsWith("/") ? next : fallback)
    } catch (error) {
      toast.error("Could not change password", {
        description: error instanceof Error ? error.message : "Check your current password and try again."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      compact
      panelTitle="Secure your admin account before going live."
      panelKicker="Africa's expo digital platform"
      cardClassName="p-0 overflow-hidden"
    >
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
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/15 ring-1 ring-warning/30">
                <WarningIcon />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-warning">Security step</p>
            </div>
            <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
              Set your password
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Replace your temporary password before proceeding.
            </p>
          </div>
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
            <Image src="/tandaza-logo.svg" alt="Tandaza" width={24} height={24} priority />
          </span>
        </div>

        {/* Warning banner */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
          <ShieldAlertIcon />
          <p className="text-[12px] leading-5 text-slate-600">
            Your account was created with a temporary password. Set a private one to secure the administrator console.
          </p>
        </div>

        <div className="my-6 h-px w-full bg-border/50" />

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Temporary password */}
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="block text-[13px] font-semibold text-foreground">
              Temporary password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <KeyIcon />
              </span>
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password"
                className={inputCls + " pr-11"}
              />
              <ToggleBtn show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-[13px] font-semibold text-foreground">
              New password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <LockIcon />
              </span>
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls + " pr-11"}
              />
              <ToggleBtn show={showNew} onToggle={() => setShowNew((v) => !v)} />
            </div>
            {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-foreground">
              Confirm new password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <LockIcon />
              </span>
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputCls + " pr-11"}
              />
              <ToggleBtn show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
            </div>
            {confirmPassword.length > 0 && (
              <p className={`flex items-center gap-1.5 text-[11px] font-medium ${newPassword === confirmPassword ? "text-success" : "text-danger"}`}>
                {newPassword === confirmPassword ? <MatchIcon /> : <NoMatchIcon />}
                {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          {/* CTA */}
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
                <><Spinner className="h-4 w-4" /><span>Saving password…</span></>
              ) : (
                <><span>Save &amp; continue</span><ArrowIcon /></>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center pt-1">
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-primary"
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

/* ── Password strength ── */
function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length
  const levels = [
    { label: "Weak", color: "bg-danger" },
    { label: "Fair", color: "bg-warning" },
    { label: "Good", color: "bg-success/70" },
    { label: "Strong", color: "bg-success" }
  ]
  const { label, color } = levels[score - 1] ?? levels[0]
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? color : "bg-border"}`} />
        ))}
      </div>
      <p className="text-[11px] text-slate-400">Strength: <span className="font-semibold text-foreground">{label}</span></p>
    </div>
  )
}

const inputCls =
  "w-full rounded-xl border border-border bg-elevated py-3 pl-10 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"

function ToggleBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 transition hover:text-slate-600 focus:outline-none" aria-label={show ? "Hide" : "Show"}>
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function KeyIcon() {
  return <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden><circle cx="7" cy="8" r="4" stroke="currentColor" strokeWidth="1.35" /><path d="M10.5 10.5l5 5M13 13l2-2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /></svg>
}
function LockIcon() {
  return <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden><rect x="2.5" y="8" width="13" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" /><path d="M5.5 8V5.5a3.5 3.5 0 017 0V8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /><circle cx="9" cy="12.25" r="1.25" fill="currentColor" /></svg>
}
function EyeIcon() {
  return <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden><path d="M1.5 9S4 4 9 4s7.5 5 7.5 5S14 14 9 14 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.3" /><circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.3" /></svg>
}
function EyeOffIcon() {
  return <svg viewBox="0 0 18 18" fill="none" className="h-4 w-4" aria-hidden><path d="M1.5 9S4 4 9 4s7.5 5 7.5 5S14 14 9 14 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.3" /><circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.3" /><path d="M2.5 2.5l13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}
function WarningIcon() {
  return <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-warning" aria-hidden><path d="M6 2L11 10H1L6 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M6 6v2M6 8.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
}
function ShieldAlertIcon() {
  return <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" aria-hidden><path d="M10 2L3 5.5v5c0 4 3.5 7 7 7.5 3.5-.5 7-3.5 7-7.5v-5L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M10 8v3M10 12.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}
function MatchIcon() {
  return <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function NoMatchIcon() {
  return <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
}
function ArrowIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function BackArrowIcon() {
  return <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
