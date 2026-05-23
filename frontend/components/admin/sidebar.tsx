"use client"

import Image from "next/image"
import Link from "next/link"
import { adminNavItems, AdminNavItem } from "@/lib/config/routes"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { iconForKey } from "@/components/ui/icons"
import { useSessionStore } from "@/store/session-store"

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onClose,
  navItems = adminNavItems
}: {
  collapsed: boolean
  mobileOpen: boolean
  onClose: () => void
  navItems?: AdminNavItem[]
}) {
  const pathname = usePathname()
  const user = useSessionStore((state) => state.user)
  const currentNavItems = navItems || adminNavItems
  
  // Dynamically get unique sections from nav items
  const sections = [...new Set(currentNavItems.map((item) => item.section))] as string[]

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "TA"

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden",
          "border-r border-white/[0.08] bg-sidebar text-sidebarForeground shadow-[18px_0_60px_hsl(var(--foreground)/0.10)]",
          // Mobile: always full width drawer, transforms in/out
          "w-[260px] -translate-x-full transition-transform duration-300 ease-in-out",
          mobileOpen && "translate-x-0",
          // Desktop: always visible, width transitions on collapse
          "lg:translate-x-0 lg:transition-[width] lg:duration-300 lg:ease-in-out",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
        )}
      >
        {/* Depth gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_50%_at_50%-5%,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[hsl(var(--foreground)/0.18)] to-transparent" />

        {/* ── Brand header ─────────────────────────── */}
        <div className="relative flex h-[64px] shrink-0 items-center gap-3 border-b border-white/[0.08] px-4">
          {/* Logo mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)/0.55),hsl(var(--accent)/0.35))] ring-1 ring-white/20 shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.18)]">
            <Image src="/tandaza-logo.svg" alt="Tandaza" width={22} height={22} className="h-[22px] w-[22px]" priority />
          </div>

          {/* Brand text — slides out on desktop collapse */}
          <div
            className={cn(
              "flex flex-col overflow-hidden transition-[width,opacity] duration-300",
              collapsed ? "lg:w-0 lg:opacity-0" : "w-[200px] opacity-100"
            )}
          >
            <span className="whitespace-nowrap text-[15px] font-bold leading-tight tracking-tight text-white">Tandaza</span>
            <span className={cn(
              "mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-tight tracking-[0.22em] text-slate-400/75",
              collapsed && "lg:hidden"
            )}>
              {user?.role === "visitor" ? "Visitor Account" : user?.role === "organizer" ? "Organizer Workspace" : user?.role === "administrator" || user?.role === "super_administrator" ? "Admin Console" : user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) + " Workspace" : "Admin Console"}
            </span>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────── */}
        <nav className="relative flex-1 overflow-x-hidden overflow-y-auto px-2 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-5">
            {sections.map((section, sectionIndex) => (
              <div key={section}>
                {/* Section label (expanded) or divider (collapsed) */}
                <div className="mb-1 h-5 overflow-hidden">
                  {/* Label — always shown on mobile; hidden on desktop when collapsed */}
                  <p
                    className={cn(
                      "px-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500/95 transition-[opacity] duration-200",
                      collapsed ? "lg:opacity-0" : "opacity-100"
                    )}
                  >
                    {sectionIndex > 0 ? section : section}
                  </p>
                </div>

                <div className="space-y-0.5">
                  {currentNavItems
                    .filter((item) => item.section === section)
                    .map((item) => {
                      const active = pathname === item.href
                      const Icon = iconForKey(item.icon)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-2xl px-2 py-2.5 text-sm font-medium",
                            "transition-all duration-150",
                            // Desktop collapsed: center icon, kill gap so no ghost space
                            collapsed && "lg:justify-center lg:px-0 lg:gap-0",
                            active
                              ? "bg-white/[0.14] text-white shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.08)]"
                              : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                          )}
                        >
                          {/* Active indicator bar (only when expanded) */}
                          {active && (
                            <span
                              className={cn(
                                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary",
                                "shadow-[0_0_12px_hsl(var(--primary)/0.65)]",
                                collapsed && "lg:hidden"
                              )}
                            />
                          )}

                          {/* Icon */}
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-150",
                              active
                                ? "text-white shadow-[0_8px_18px_hsl(var(--primary)/0.35)]"
                                : "text-slate-400 group-hover:text-white"
                            )}
                            style={active ? { background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" } : undefined}
                          >
                            <Icon className="h-[17px] w-[17px]" />
                          </span>

                          {/* Label — clip to zero width on desktop collapse */}
                          <span
                            className={cn(
                              "overflow-hidden whitespace-nowrap leading-none",
                              "transition-[width,opacity] duration-300",
                              collapsed
                                ? "lg:w-0 lg:opacity-0"
                                : "w-auto opacity-100"
                            )}
                          >
                            {item.label}
                          </span>

                          {/* Tooltip — desktop collapsed only */}
                          {collapsed && (
                            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 lg:flex">
                              <span className="relative flex items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                {/* Caret */}
                                <span className="absolute -left-[4px] h-2 w-2 rotate-45 border-b border-l border-border/60 bg-card" />
                                <span className="block whitespace-nowrap rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-float">
                                  {item.label}
                                </span>
                              </span>
                            </span>
                          )}
                        </Link>
                      )
                    })}
                </div>

                {/* Divider between sections when collapsed on desktop */}
                {sectionIndex < sections.length - 1 && (
                  <div
                    className={cn(
                      "mt-3 h-px bg-white/[0.06] transition-opacity duration-200",
                      collapsed ? "lg:opacity-100" : "lg:opacity-0"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* ── Footer: user identity ─────────────────── */}
        <div className="relative shrink-0 border-t border-white/[0.08] px-2 py-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05]",
              "px-2.5 py-2.5 transition-all duration-150 hover:bg-white/[0.07]",
              collapsed && "lg:justify-center lg:gap-0 lg:px-0"
            )}
          >
            {/* Avatar */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-accent/60 text-[11px] font-bold text-white ring-1 ring-white/20">
              {initials}
            </span>

            {/* Name + role — slides out on desktop collapse */}
            <div
              className={cn(
                "overflow-hidden",
                "transition-[width,opacity] duration-300",
                collapsed ? "lg:w-0 lg:opacity-0" : "w-full opacity-100"
              )}
            >
              <p className="truncate whitespace-nowrap text-[13px] font-semibold leading-tight text-slate-200">
                {user?.name ?? "Administrator"}
              </p>
              <p className="mt-0.5 truncate whitespace-nowrap text-[10px] capitalize leading-tight text-slate-500">
                {(user?.role ?? "administrator").replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
