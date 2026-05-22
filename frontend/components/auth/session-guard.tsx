"use client"

import { Role } from "@/lib/api/contracts"
import { getRedirectForRole } from "@/lib/auth/redirects"
import { useSessionStore } from "@/store/session-store"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"

export function SessionGuard({ children, allowedRoles }: { children: ReactNode; allowedRoles?: Role[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const { hydrated, user } = useSessionStore()
  const currentPath = typeof window === "undefined" ? pathname : `${pathname}${window.location.search}`
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`
  const fallbackHref = user && allowedRoles && !allowedRoles.includes(user.role) ? getRedirectForRole(user.role) : loginHref

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace(loginHref)
      return
    }

    if (user.mustChangePassword && (user.role === "administrator" || user.role === "super_administrator") && pathname !== "/change-password") {
      router.replace(`/change-password?next=${encodeURIComponent(getRedirectForRole(user.role))}`)
      return
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(getRedirectForRole(user.role))
    }
  }, [allowedRoles, hydrated, loginHref, pathname, router, user])

  if (!hydrated || !user || (allowedRoles && !allowedRoles.includes(user.role))) {
    const stateLabel = !hydrated
      ? "Checking your secure session..."
      : !user
        ? "Redirecting to login..."
        : "Opening the right workspace for your account..."
    const actionLabel = user ? "Open workspace" : "Go to login"

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Spinner className="h-8 w-8 text-primary" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{stateLabel}</p>
          {hydrated ? (
            <Link className="text-sm font-semibold text-primary underline-offset-4 hover:underline" href={fallbackHref}>
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
