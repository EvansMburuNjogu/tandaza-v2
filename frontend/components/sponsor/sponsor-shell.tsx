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
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={activeNavItems}
      />
      <div className={collapsed ? "lg:pl-[72px] transition-[padding] duration-300 ease-in-out" : "lg:pl-[260px] transition-[padding] duration-300 ease-in-out"}>
        <div className="flex h-screen flex-col">
          <AdminTopbar
            collapsed={collapsed}
            onToggleMenu={() => setMobileOpen((v) => !v)}
            onToggleSidebar={toggleCollapsed}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
          <MobileBottomNav items={activeNavItems} onMore={() => setMobileOpen(true)} />
        </div>
      </div>
    </div>
  )
}
