"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { googleAuth } from "@/lib/auth/client-api"
import { getRedirectForRole } from "@/lib/auth/redirects"
import { httpOnlySessionToken } from "@/lib/auth/session-token"
import { cn } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: string }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

export function GoogleAuthButton({ label = "Continue with Google", nextPath, disabled = false }: { label?: string; nextPath?: string; disabled?: boolean }) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const setSession = useSessionStore((state) => state.setSession)
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">("loading")

  useEffect(() => {
    if (disabled) {
      setStatus("ready")
      return
    }
    let cancelled = false

    async function loadGoogle() {
      setStatus("loading")
      const [config] = await Promise.all([
        fetch("/api/auth/google/config", { cache: "no-store" }).then((res) => res.json()).catch(() => ({ enabled: false, clientId: "" })),
        loadGoogleScript().catch(() => null)
      ])
      if (cancelled) return
      if (!config.enabled || !config.clientId || !buttonRef.current || !window.google?.accounts?.id) {
        setStatus("hidden")
        return
      }
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        ux_mode: "popup",
        callback: async (response) => {
          if (!response.credential) {
            toast.error("Google did not return a sign-in token.")
            return
          }
          try {
            const session = await googleAuth({ idToken: response.credential })
            setSession({ token: httpOnlySessionToken, user: session.user })
            toast.success("Signed in with Google")
            const roleHome = getRedirectForRole(session.user.role)
            const redirectTo = nextPath?.startsWith(roleHome) ? nextPath : session.redirectTo || roleHome
            window.location.assign(redirectTo)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Google sign-in failed.")
          }
        }
      })
      buttonRef.current.innerHTML = ""
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: buttonRef.current.offsetWidth || 320,
        text: "continue_with"
      })
      setStatus("ready")
    }

    loadGoogle()
    return () => {
      cancelled = true
    }
  }, [disabled, nextPath, setSession])

  if (status === "hidden") return null
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-border/80 bg-card px-4 text-sm font-semibold text-slate-400 opacity-70 shadow-sm"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-500">G</span>
        <span>{label}</span>
      </button>
    )
  }
  return (
    <div className="relative min-h-11">
      <div
        ref={buttonRef}
        className={cn("flex min-h-11 justify-center transition-opacity", status === "ready" ? "opacity-100" : "pointer-events-none opacity-0")}
        aria-label={label}
      />
      {status !== "ready" ? (
        <button
          type="button"
          disabled
          className="absolute inset-0 inline-flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border/80 bg-card px-4 text-sm font-semibold text-slate-500 shadow-sm"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-500">G</span>
          <span>{label}</span>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
        </button>
      ) : null}
    </div>
  )
}

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Could not load Google sign-in."))
    document.head.appendChild(script)
  })
}
