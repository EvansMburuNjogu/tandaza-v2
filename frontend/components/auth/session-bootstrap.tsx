"use client"

import { useEffect } from "react"
import { httpOnlySessionToken } from "@/lib/auth/session-token"
import { useSessionStore } from "@/store/session-store"

export function SessionBootstrap() {
  const { setSession, clearSession } = useSessionStore()

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" })
        if (!response.ok) throw new Error("Session unavailable")
        const payload = await response.json()
        if (!cancelled) setSession({ token: payload.user ? httpOnlySessionToken : null, user: payload.user || null })
      } catch {
        if (!cancelled) clearSession()
      }
    }

    loadSession()
    return () => {
      cancelled = true
    }
  }, [clearSession, setSession])

  return null
}
