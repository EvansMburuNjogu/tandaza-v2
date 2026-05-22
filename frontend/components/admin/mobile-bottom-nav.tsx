"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AdminNavItem } from "@/lib/config/routes"
import { cn } from "@/lib/utils"
import { iconForKey } from "@/components/ui/icons"

export function MobileBottomNav({
  items,
  onMore,
  badges
}: {
  items: AdminNavItem[]
  onMore: () => void
  badges?: Record<string, number>
}) {
  const pathname = usePathname()
  const activeItem = items.find((item) => isActivePath(pathname, item.href))
  const primaryItems = items.slice(0, 4)
  const visibleItems =
    activeItem && !primaryItems.some((item) => item.href === activeItem.href)
      ? [...primaryItems.slice(0, 3), activeItem]
      : primaryItems

  const overflowHasActive =
    !!activeItem && !visibleItems.some((item) => item.href === activeItem.href)

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-40 lg:hidden"
    >
      <div className="rounded-2xl border border-border/60 bg-card/95 shadow-[0_8px_32px_hsl(var(--foreground)/0.08),0_2px_8px_hsl(var(--foreground)/0.04)] backdrop-blur-xl">
        <div className="grid grid-cols-5 px-1.5 py-1.5">

          {visibleItems.map((item) => {
            const Icon = iconForKey(item.icon)
            const active = isActivePath(pathname, item.href)
            const badgeCount = badges?.[item.href]

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 transition-all duration-150 active:scale-95 active:opacity-80"
              >
                {/* Icon */}
                <div className="relative">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150",
                      active
                        ? "text-white shadow-[0_4px_14px_hsl(var(--primary)/0.38)]"
                        : "text-slate-400 group-hover:text-foreground"
                    )}
                    style={
                      active
                        ? { background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }
                        : undefined
                    }
                  >
                    <Icon
                      className="h-[17px] w-[17px] shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                      aria-hidden
                    />
                  </span>

                  {/* Badge */}
                  {badgeCount != null && badgeCount > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none text-white ring-[1.5px] ring-card"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "max-w-full truncate text-[11px] leading-none transition-colors duration-150",
                    active ? "font-bold text-primary" : "font-medium text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* More */}
          <button
            type="button"
            onClick={onMore}
            className="group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 transition-all duration-150 active:scale-95 active:opacity-80"
            aria-label="Open full navigation"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors duration-150 group-hover:text-foreground">
              <MoreGridIcon className="h-[17px] w-[17px] shrink-0" />
              {overflowHasActive && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-[1.5px] ring-card"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
                />
              )}
            </span>
            <span className={cn(
              "text-[11px] font-medium leading-none transition-colors duration-150",
              overflowHasActive ? "font-bold text-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            )}>
              More
            </span>
          </button>

        </div>
      </div>
    </nav>
  )
}

function MoreGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <circle cx="3.5" cy="3.5" r="1.5" />
      <circle cx="9" cy="3.5" r="1.5" />
      <circle cx="14.5" cy="3.5" r="1.5" />
      <circle cx="3.5" cy="9" r="1.5" />
      <circle cx="9" cy="9" r="1.5" />
      <circle cx="14.5" cy="9" r="1.5" />
      <circle cx="3.5" cy="14.5" r="1.5" />
      <circle cx="9" cy="14.5" r="1.5" />
      <circle cx="14.5" cy="14.5" r="1.5" />
    </svg>
  )
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true
  const isShallowRoot = href === "/" || href.split("/").filter(Boolean).length <= 1
  if (isShallowRoot) return false
  return pathname.startsWith(`${href}/`)
}
