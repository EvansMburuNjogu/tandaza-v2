"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { logout } from "@/lib/auth/client-api"
import { useSessionStore } from "@/store/session-store"
import { Spinner } from "@/components/ui/spinner"

type QRResolveResponse = {
  targetPath?: string
}

function visitorLoginPath(targetPath: string) {
  return `/login?next=${encodeURIComponent(targetPath)}`
}

export default function QRRedirectPage() {
  const router = useRouter()
  const params = useParams<{ code: string }>()
  const { hydrated, user, clearSession } = useSessionStore()
  const [message, setMessage] = useState("Opening exhibitor profile...")

  useEffect(() => {
    if (!hydrated) return

    let cancelled = false

    async function resolveAndRoute() {
      const fallbackTarget = "/visitor/expos"
      let targetPath = fallbackTarget

      try {
        const response = await fetch(`/api/backend/api/v1/qr/${encodeURIComponent(params.code)}`, { cache: "no-store" })
        if (response.ok) {
          const payload = (await response.json()) as QRResolveResponse
          if (payload.targetPath?.startsWith("/visitor/")) {
            targetPath = payload.targetPath
          }
        } else {
          toast.error("QR code could not be opened", { description: "Please sign in to browse available exhibitor profiles." })
        }
      } catch {
        toast.error("QR code could not be opened", { description: "Please sign in to browse available exhibitor profiles." })
      }

      if (cancelled) return

      if (!user) {
        setMessage("Sign in or register to continue to this exhibitor profile.")
        router.replace(visitorLoginPath(targetPath))
        return
      }

      if (user.role === "visitor") {
        router.replace(targetPath)
        return
      }

      setMessage("This QR code is for visitors. Signing out this workspace first...")
      try {
        await logout()
      } catch {
        // The local session still needs to be cleared so the visitor can sign in.
      }
      clearSession()
      router.replace(visitorLoginPath(targetPath))
    }

    resolveAndRoute()
    return () => {
      cancelled = true
    }
  }, [clearSession, hydrated, params.code, router, user])

  const targetPath = "/visitor/expos"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
        <Spinner className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Opening Tandaza exhibitor profile</h1>
        <p className="max-w-sm text-sm leading-6 text-muted">{message}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <a className="font-semibold text-primary underline-offset-4 hover:underline" href={visitorLoginPath(targetPath)}>Sign in</a>
      </div>
    </div>
  )
}
