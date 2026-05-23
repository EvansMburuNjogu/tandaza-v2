"use client"

import { ReactNode, useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminTopbar } from "@/components/admin/topbar"
import { MobileBottomNav } from "@/components/admin/mobile-bottom-nav"
import { adminNavItemsForRole } from "@/lib/config/routes"
import { useSessionStore } from "@/store/session-store"
import { usePathname, useRouter } from "next/navigation"

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const user = useSessionStore((state) => state.user)
  const pathname = usePathname()
  const router = useRouter()
  const navItems = adminNavItemsForRole(user?.role)
  const globalRoute = /^\/administrator\/(global|users|notifications|audit-logs|settings|categories|countries)(\/|$)/.test(pathname)

  useEffect(() => {
    if (user?.role === "administrator" && globalRoute) {
      router.replace("/administrator")
    }
  }, [globalRoute, router, user?.role])

  // Restore persisted sidebar state
  useEffect(() => {
    const stored = window.localStorage.getItem("tandaza-admin-sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  // Auto-close mobile drawer when viewport reaches desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setMobileOpen(false)
    }
    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [])

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value
      window.localStorage.setItem("tandaza-admin-sidebar-collapsed", String(next))
      return next
    })
  }

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_18%_-10%,hsl(var(--primary)/0.10),transparent_58%),radial-gradient(ellipse_55%_40%_at_100%_12%,hsl(var(--accent)/0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 border-b border-border/40 bg-gradient-to-b from-card/35 to-transparent" />
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={navItems}
      />
      <div className={collapsed ? "relative z-10 min-w-0 max-w-full lg:pl-[72px] transition-[padding] duration-300 ease-in-out" : "relative z-10 min-w-0 max-w-full lg:pl-[260px] transition-[padding] duration-300 ease-in-out"}>
        <div className="flex h-screen min-w-0 max-w-full flex-col">
          <AdminTopbar
            collapsed={collapsed}
            onToggleMenu={() => setMobileOpen((v) => !v)}
            onToggleSidebar={toggleCollapsed}
            showAdminScopeControls
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-32 sm:px-6 sm:py-5 sm:pb-28 lg:px-8 lg:py-7 lg:pb-8">
            <div className="mx-auto w-full min-w-0 max-w-[1600px]">
              {children}
            </div>
          </main>
          <MobileBottomNav items={navItems} onMore={() => setMobileOpen(true)} />
        </div>
      </div>
    </div>
  )
}
