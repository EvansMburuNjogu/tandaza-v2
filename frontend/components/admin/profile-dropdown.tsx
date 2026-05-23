"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { logout } from "@/lib/auth/client-api"
import { useSessionStore } from "@/store/session-store"
import { cn } from "@/lib/utils"

export function ProfileDropdown() {
  const router = useRouter()
  const { user, clearSession } = useSessionStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const settingsHref = (() => {
    const role = user?.role
    if (role === "visitor") return "/visitor/settings"
    if (role === "organizer") return "/organizer/settings"
    if (role === "exhibitor") return "/exhibitor/settings"
    if (role === "sponsorship") return "/sponsor/settings"
    return "/administrator/settings"
  })()

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "TA"

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Keep local sign-out responsive even if the logout request is interrupted.
    }
    clearSession()
    router.replace("/login")
  }

  return (
    <div className="relative z-[60]" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="group flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 py-1.5 pl-2 pr-2.5 shadow-sm transition hover:border-primary/20 hover:bg-card sm:pr-3"
      >
        {/* Avatar */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-accent/60 text-[11px] font-bold text-white ring-1 ring-primary/20">
          {initials}
        </span>

        {/* Name + role — sm+ only */}
        <span className="hidden flex-col text-left sm:flex">
          <span className="text-[13px] font-semibold leading-tight text-foreground">
            {user?.name ?? "Administrator"}
          </span>
          <span className="text-[10px] capitalize leading-tight text-slate-500">
            {user?.role ?? "admin"}
          </span>
        </span>

        {/* Chevron */}
        <svg
          className={cn(
            "ml-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-500",
            open && "rotate-180"
          )}
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden
        >
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="animate-dropdown-in absolute right-0 top-[calc(100%+8px)] z-[70] w-64 overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-float backdrop-blur-xl">

          {/* User header */}
          <div className="flex items-center gap-3 border-b border-border/60 bg-elevated/80 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-accent/60 text-sm font-bold text-white ring-1 ring-primary/20">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <span className="mt-1.5 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold capitalize tracking-wide text-primary ring-1 ring-primary/15">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="p-1.5">
            <Link href={settingsHref} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-elevated">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.3 9.9a1.1 1.1 0 0 0 .22 1.21l.04.04a1.33 1.33 0 0 1-1.88 1.88l-.04-.04a1.1 1.1 0 0 0-1.21-.22 1.1 1.1 0 0 0-.67 1.01V14a1.33 1.33 0 0 1-2.67 0v-.06a1.1 1.1 0 0 0-.72-.99 1.1 1.1 0 0 0-1.21.22l-.04.04a1.33 1.33 0 0 1-1.88-1.88l.04-.04A1.1 1.1 0 0 0 3.44 10a1.1 1.1 0 0 0-1.01-.67H2a1.33 1.33 0 0 1 0-2.67h.06a1.1 1.1 0 0 0 .99-.72 1.1 1.1 0 0 0-.22-1.21l-.04-.04a1.33 1.33 0 0 1 1.88-1.88l.04.04A1.1 1.1 0 0 0 6 3.44a1.1 1.1 0 0 0 .67-1.01V2a1.33 1.33 0 0 1 2.67 0v.06a1.1 1.1 0 0 0 .67 1.01 1.1 1.1 0 0 0 1.21-.22l.04-.04a1.33 1.33 0 0 1 1.88 1.88l-.04.04A1.1 1.1 0 0 0 12.56 6a1.1 1.1 0 0 0 1.01.67H14a1.33 1.33 0 0 1 0 2.67h-.06a1.1 1.1 0 0 0-1.01.67Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Settings
            </Link>
          </div>
          <div className="border-t border-border/60 p-1.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/8"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
