"use client"

import { useEffect, useRef } from "react"
import { useSessionStore } from "@/store/session-store"

const vexoDeviceIdKey = "tandaza:vexo-device-id"

type VexoGlobal = {
  identifyDevice?: (id: string | null) => Promise<void> | void
  customEvent?: (name: string, args?: Record<string, unknown>) => void
}

declare global {
  // eslint-disable-next-line no-var
  var vexo: VexoGlobal | undefined
}

export function VexoAnalytics() {
  const hydrated = useSessionStore((state) => state.hydrated)
  const user = useSessionStore((state) => state.user)
  const lastIdentified = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return

    const userIdentifier = user?.email?.trim().toLowerCase() || null
    if (lastIdentified.current === userIdentifier) return

    let attempts = 0
    const identify = () => {
      attempts += 1
      const vexo = globalThis.vexo
      if (typeof vexo?.identifyDevice === "function") {
        vexo.identifyDevice(userIdentifier)
        lastIdentified.current = userIdentifier
        if (userIdentifier) {
          window.localStorage.setItem(vexoDeviceIdKey, userIdentifier)
        } else {
          window.localStorage.removeItem(vexoDeviceIdKey)
        }
        return true
      }
      return attempts >= 20
    }

    if (identify()) return
    const timer = window.setInterval(() => {
      if (identify()) window.clearInterval(timer)
    }, 500)
    return () => window.clearInterval(timer)
  }, [hydrated, user?.email])

  return null
}
