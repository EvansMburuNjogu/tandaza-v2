"use client"

import { ReactNode, useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminTopbar } from "@/components/admin/topbar"
import { MobileBottomNav } from "@/components/admin/mobile-bottom-nav"
import { TandazaIntroTour } from "@/components/onboarding/tandaza-intro-tour"
import { visitorNavItems, AdminNavItem } from "@/lib/config/routes"

export function VisitorShell({ 
  children,
  navItems 
}: { 
  children: ReactNode
  navItems?: AdminNavItem[]
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const activeNavItems = navItems || visitorNavItems

  useEffect(() => {
    const stored = window.localStorage.getItem("tandaza-visitor-sidebar-collapsed")
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
      window.localStorage.setItem("tandaza-visitor-sidebar-collapsed", String(next))
      return next
    })
  }

  return (
    <div className="relative min-h-screen w-full max-w-[100dvw] overflow-x-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.45)_42%,hsl(var(--background)))] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-45" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_72%_48%_at_18%_-12%,hsl(var(--primary)/0.16),transparent_62%),radial-gradient(ellipse_50%_42%_at_94%_8%,hsl(var(--accent)/0.10),transparent_56%)]" />
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
          <main data-tour="workspace" className="relative z-10 min-w-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-36 pt-[88px] sm:px-6 sm:pb-40 sm:pt-[92px] lg:px-8 lg:py-8 lg:pb-16">
            <div className="mx-auto w-full min-w-0 max-w-[1600px]">
              {children}
            </div>
          </main>
          <MobileBottomNav items={activeNavItems} onMore={() => setMobileOpen(true)} />
          <TandazaIntroTour role="visitor" />
        </div>
      </div>
    </div>
  )
}
