"use client"

import { ReactNode, useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminTopbar } from "@/components/admin/topbar"
import { MobileBottomNav } from "@/components/admin/mobile-bottom-nav"
import { sponsorNavItems, AdminNavItem } from "@/lib/config/routes"

export function SponsorShell({ 
  children,
  navItems 
}: { 
  children: ReactNode
  navItems?: AdminNavItem[]
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const activeNavItems = navItems || sponsorNavItems

  useEffect(() => {
    const stored = window.localStorage.getItem("tandaza-sponsor-sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

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
      window.localStorage.setItem("tandaza-sponsor-sidebar-collapsed", String(next))
      return next
    })
  }

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={activeNavItems}
      />
      <div className={collapsed ? "relative z-10 min-w-0 max-w-full lg:pl-[72px] transition-[padding] duration-300 ease-in-out" : "relative z-10 min-w-0 max-w-full lg:pl-[260px] transition-[padding] duration-300 ease-in-out"}>
        <div className="flex h-screen min-w-0 max-w-full flex-col">
          <AdminTopbar
            collapsed={collapsed}
            onToggleMenu={() => setMobileOpen((v) => !v)}
            onToggleSidebar={toggleCollapsed}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-28 pt-[88px] sm:px-6 sm:pt-[92px] lg:px-8 lg:py-8 lg:pb-8">
            <div className="mx-auto w-full min-w-0 max-w-[1600px]">
              {children}
            </div>
          </main>
          <MobileBottomNav items={activeNavItems} onMore={() => setMobileOpen(true)} />
        </div>
      </div>
    </div>
  )
}
