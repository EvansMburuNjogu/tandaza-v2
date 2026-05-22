"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { availableCountries } from "@/lib/country-options"
import { AuthShell } from "@/components/auth/auth-shell"
import { GoogleAuthButton } from "@/components/auth/google-auth-button"

export function RegisterForm() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [countryCode, setCountryCode] = useState("KE")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries() })
  const countryOptions = availableCountries(countries.data?.items)
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"

  useEffect(() => {
    if (!countryOptions.length) return
    if (!countryOptions.some((country) => country.code === countryCode)) {
      setCountryCode(countryOptions.find((country) => country.code === "KE")?.code || countryOptions[0].code)
    }
  }, [countryCode, countryOptions])

  return (
    <AuthShell
      panelTitle="Be present at the expo, even when you are not in the room."
      cardClassName="overflow-hidden p-0"
    >
      <div
        className="h-[3px] w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 40%, hsl(var(--accent)) 70%, transparent 100%)"
        }}
      />

      <div className="px-7 pb-8 pt-7 sm:px-9 sm:pb-9 sm:pt-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Create account</p>
            <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
              Join Tandaza
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Visitor registration is currently invite-only.
            </p>
          </div>
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
            <Image src="/tandaza-logo.svg" alt="Tandaza" width={24} height={24} priority />
          </span>
        </div>

        <div className="my-6 h-px w-full bg-border/50" />

        <form className="space-y-4" onSubmit={(event) => event.preventDefault()} aria-describedby="registration-disabled-note">
          <GoogleAuthButton label="Sign up with Google" nextPath={nextPath || undefined} disabled />

          <div className="flex items-center">
            <div className="h-px flex-1 bg-border/50" />
            <span className="mx-3 text-[11px] font-medium text-slate-400">or use email</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div id="registration-disabled-note" className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-[13px] leading-6 text-slate-600">
            New visitor registration is paused. You can review the form, but account creation is disabled for now.
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-[13px] font-semibold text-foreground">Full name</label>
            <IconInput icon={<UserIcon />}>
              <input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Wanjiku" className={inputCls} />
            </IconInput>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[13px] font-semibold text-foreground">Email address</label>
            <IconInput icon={<MailIcon />}>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className={inputCls} />
            </IconInput>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="countryCode" className="block text-[13px] font-semibold text-foreground">Country</label>
            <IconInput icon={<GlobeIcon />}>
              <select
                id="countryCode"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className="w-full appearance-none rounded-xl border border-border bg-elevated py-3 pl-10 pr-10 text-[13.5px] text-foreground shadow-sm transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
                {!countries.data?.items.length && <option value="KE">Kenya</option>}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                <ChevronIcon />
              </span>
            </IconInput>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-semibold text-foreground">Password</label>
              <IconInput icon={<LockIcon />}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Min 8 characters"
                  className={`${inputCls} pr-10`}
                />
                <VisibilityToggle shown={showPassword} onClick={() => setShowPassword((value) => !value)} />
              </IconInput>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-foreground">Confirm</label>
              <IconInput icon={<LockIcon />}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter"
                  className={`${inputCls} pr-10`}
                />
                <VisibilityToggle shown={showConfirm} onClick={() => setShowConfirm((value) => !value)} />
              </IconInput>
            </div>
          </div>

          <button
            type="submit"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-primary/45 py-3 text-[14px] font-semibold text-white opacity-70 shadow-sm"
          >
            Create account
          </button>

          <div className="relative flex items-center pt-1">
            <div className="h-px flex-1 bg-border/50" />
            <span className="mx-3 text-[11px] font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <p className="text-center text-[13px] text-slate-500">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-primary transition hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  )
}

function IconInput({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
        {icon}
      </span>
      {children}
    </div>
  )
}

function VisibilityToggle({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600 focus:outline-none" aria-label={shown ? "Hide" : "Show"}>
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

const inputCls =
  "w-full rounded-xl border border-border bg-elevated py-3 pl-10 pr-4 text-[13.5px] text-foreground shadow-sm placeholder:text-slate-400/80 transition-all duration-150 focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"

function UserIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden>
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.35" />
      <path d="M2.5 16c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden>
      <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M1.5 5.5l7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" className="h-[15px] w-[15px]" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.35" />
      <path d="M9 2C9 2 6.5 5 6.5 9s2.5 7 2.5 7M9 2c0 0 2.5 3 2.5 7S9 16 9 16M2 9h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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
