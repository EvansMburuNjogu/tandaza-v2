"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { verifyEmail } from "@/lib/auth/client-api"
import { httpOnlySessionToken } from "@/lib/auth/session-token"
import { Spinner } from "@/components/ui/spinner"
import { useSessionStore } from "@/store/session-store"
import { AuthShell } from "@/components/auth/auth-shell"

export function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setSession } = useSessionStore()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const token = searchParams.get("token") || ""

  useEffect(() => {
    let active = true
    async function run() {
      if (!token) {
        setStatus("error")
        toast.error("Could not verify email", { description: "This verification link is missing its token." })
        return
      }
      try {
        const response = await verifyEmail({ token })
        if (!active) return
        setSession({ token: httpOnlySessionToken, user: response.user })
        setStatus("success")
        toast.success("Email verified", { description: "Your account is ready." })
        const pendingNext = window.localStorage.getItem("tandaza:postVerifyNext") || ""
        if (pendingNext) window.localStorage.removeItem("tandaza:postVerifyNext")
        const redirectTo = response.user.role === "visitor" && pendingNext.startsWith("/visitor/") ? pendingNext : response.redirectTo
        router.replace(redirectTo)
      } catch (error) {
        if (!active) return
        const description = error instanceof Error ? error.message : "Verification failed."
        setStatus("error")
        toast.error("Could not verify email", { description })
      }
    }
    run()
    return () => { active = false }
  }, [router, setSession, token])

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
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">Email verification</p>
            <h2 className="mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
              {status === "loading" ? "Verifying…" : status === "success" ? "Verified!" : "Link unavailable"}
            </h2>
            <p className="mt-1.5 text-[13px] text-slate-500">
              {status === "loading"
                ? "Confirming your account, hold on."
                : status === "success"
                ? "Redirecting to your account."
                : "The link may be expired or already used."}
            </p>
          </div>
          <Image src="/tandaza-logo.png" alt="Tandaza" width={60} height={60} className="h-[60px] w-[60px] flex-shrink-0 object-contain" priority />
        </div>

        <div className="my-7 h-px w-full bg-border/50" />

        {/* Status body */}
        <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
          {status === "loading" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
                <Spinner className="h-7 w-7 text-primary" />
              </div>
              <p className="mt-5 text-[13px] leading-6 text-slate-500">
                This usually takes just a moment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 ring-1 ring-success/20">
                <CheckIcon />
              </div>
              <p className="mt-4 font-semibold text-foreground">Email confirmed</p>
              <p className="mt-1.5 text-[13px] text-slate-500">Opening your Tandaza account…</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 ring-1 ring-danger/20">
                <XIcon />
              </div>
              <p className="mt-4 font-semibold text-foreground">Verification failed</p>
              <p className="mt-1.5 max-w-[260px] text-[13px] leading-6 text-slate-500">
                The link is missing, expired, or already used.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/register"
                  className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-primary/20"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                    boxShadow: "0 4px 14px hsl(var(--primary)/0.28)"
                  }}
                >
                  <span className="pointer-events-none absolute inset-0 bg-white/0 transition group-hover:bg-white/[0.06]" />
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-elevated px-5 py-2.5 text-[13px] font-semibold text-foreground transition hover:bg-secondary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}

/* ── Icons ── */

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-success" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-danger" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
