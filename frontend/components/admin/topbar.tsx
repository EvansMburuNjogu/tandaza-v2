"use client"

import { BellIcon, MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "@/components/ui/icons"
import { ProfileDropdown } from "@/components/admin/profile-dropdown"
import { api } from "@/lib/api"
import { NotificationRecord } from "@/lib/api/contracts"
import { resolvePageMeta } from "@/lib/config/routes"
import { availableCountries } from "@/lib/country-options"
import { allCountriesCode, useAdminCountryStore } from "@/store/admin-country-store"
import { useSessionStore } from "@/store/session-store"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function AdminTopbar({
  collapsed,
  onToggleMenu,
  onToggleSidebar,
  showAdminScopeControls = false
}: {
  collapsed: boolean
  onToggleMenu: () => void
  onToggleSidebar: () => void
  showAdminScopeControls?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const client = useQueryClient()
  const token = useSessionStore((state) => state.token)
  const page = resolvePageMeta(pathname)
  const globalScoped = /^\/administrator\/(global|users|notifications|audit-logs|settings|categories|countries)(\/|$)/.test(pathname)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false)
  const selectedCountry = useAdminCountryStore((state) => state.selectedCountry)
  const setSelectedCountry = useAdminCountryStore((state) => state.setSelectedCountry)
  const hydrateCountry = useAdminCountryStore((state) => state.hydrateCountry)
  const countries = useQuery({ queryKey: ["platform-countries"], queryFn: () => api.getCountries(), enabled: showAdminScopeControls })
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications", token],
    queryFn: () => api.getMyNotifications(token || ""),
    enabled: Boolean(token),
    refetchInterval: 30000
  })
  const countryItems = availableCountries(countries.data?.items)
  const notifications = notificationsQuery.data?.items || []
  const unreadNotifications = notifications.filter((item) => item.unread)
  const unreadCount = unreadNotifications.length

  const readMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(token || "", id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["my-notifications"] })
  })
  const readAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(token || ""),
    onSuccess: () => {
      toast.success("Notifications marked as read.")
      client.invalidateQueries({ queryKey: ["my-notifications"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not mark notifications as read.")
  })
  const clearMutation = useMutation({
    mutationFn: (id: string) => api.clearNotification(token || "", id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["my-notifications"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not clear notification.")
  })

  useEffect(() => {
    hydrateCountry()
  }, [hydrateCountry])

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    setBrowserNotificationsEnabled(window.Notification.permission === "granted")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !browserNotificationsEnabled || unreadNotifications.length === 0) return
    const latest = unreadNotifications[0]
    const key = `tandaza:last-browser-notification:${latest.id}`
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, "shown")
    const notification = new window.Notification(latest.subject || "Tandaza notification", {
      body: latest.message || "You have a new Tandaza update.",
      tag: latest.id
    })
    notification.onclick = () => {
      window.focus()
      openNotification(latest)
    }
  }, [browserNotificationsEnabled, unreadNotifications])

  useEffect(() => {
    if (!showAdminScopeControls || globalScoped || countries.isLoading || countries.isError) return
    const fallbackCountry = countryItems.find((country) => country.code === "KE")?.code || countryItems[0]?.code || "KE"
    const selectedIsAvailable = countryItems.some((country) => country.code === selectedCountry)
    if (selectedCountry === allCountriesCode || !selectedIsAvailable) {
      setSelectedCountry(fallbackCountry)
    }
  }, [countryItems, countries.isError, countries.isLoading, globalScoped, selectedCountry, setSelectedCountry, showAdminScopeControls])

  const breadcrumb = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))

  const openNotification = (notification: NotificationRecord) => {
    readMutation.mutate(notification.id)
    setNotificationsOpen(false)
    if (!notification.actionUrl) return
    if (notification.actionUrl.startsWith("http")) {
      window.location.href = notification.actionUrl
      return
    }
    router.push(notification.actionUrl)
  }

  const enableBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not available in this browser.")
      return
    }
    const permission = await window.Notification.requestPermission()
    setBrowserNotificationsEnabled(permission === "granted")
    if (permission === "granted") {
      toast.success("Browser notifications enabled.")
    } else {
      toast.error("Browser notifications were not enabled.")
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[64px] shrink-0 items-center border-b border-border/60 bg-background/90 shadow-[0_2px_0_hsl(var(--primary)/0.06),0_1px_0_hsl(var(--border)/0.6)] backdrop-blur-xl lg:sticky lg:inset-x-auto lg:bg-background/78">

      <div className="mx-auto flex w-full max-w-[1800px] items-center gap-3 px-4 lg:px-6">

        {/* ── Left ─────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">

          {/* Mobile: open drawer */}
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-slate-500 shadow-sm backdrop-blur transition hover:border-primary/25 hover:bg-card hover:text-foreground hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:outline-none focus:ring-4 focus:ring-primary/10 lg:hidden"
            onClick={onToggleMenu}
            aria-label="Open navigation"
          >
            <MenuIcon className="h-4 w-4" />
          </button>

          {/* Desktop: collapse / expand sidebar */}
          <button
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-slate-500 shadow-sm backdrop-blur transition hover:border-primary/25 hover:bg-card hover:text-foreground hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:outline-none focus:ring-4 focus:ring-primary/10 lg:flex"
            onClick={onToggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpenIcon className="h-4 w-4" />
              : <PanelLeftCloseIcon className="h-4 w-4" />}
          </button>

          {/* Divider */}
          <div className="hidden h-5 w-px shrink-0 bg-border/50 lg:block" />

          {/* Current page context — desktop */}
          <div className="hidden min-w-0 flex-col lg:flex">
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {page.title}
            </span>
            <nav
              aria-label="Breadcrumb"
              className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/80"
            >
              {breadcrumb.slice(0, 3).map((part, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1">
                  {i > 0 && <span className="text-border">/</span>}
                  <span className={i === breadcrumb.length - 1 || i === 2 ? "truncate text-primary/80" : "truncate"}>
                    {part}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          {/* Page title — mobile only (replaces breadcrumb) */}
          <span className="truncate text-[15px] font-semibold text-foreground lg:hidden">
            {page.title}
          </span>
        </div>

        {/* ── Right ────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2">
          {showAdminScopeControls && globalScoped ? (
            <div className="hidden rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur sm:block">
              Global scope
            </div>
          ) : showAdminScopeControls ? (
            <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-2.5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur transition-colors hover:border-primary/30 sm:px-3">
              <span className="hidden uppercase tracking-[0.18em] lg:inline">Country</span>
              <select
                aria-label="Switch admin country"
                className="max-w-[104px] bg-transparent text-xs font-semibold text-foreground outline-none sm:max-w-[160px] sm:text-sm"
                value={countryItems.some((country) => country.code === selectedCountry) ? selectedCountry : ""}
                onChange={(event) => setSelectedCountry(event.target.value)}
              >
                {countryItems.length === 0 && <option value="">Loading countries</option>}
                {countryItems.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/* Notification bell */}
          <div className="relative" onMouseEnter={() => setNotificationsOpen(true)}>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-slate-500 shadow-sm backdrop-blur transition hover:border-primary/25 hover:bg-card hover:text-foreground hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:outline-none focus:ring-4 focus:ring-primary/10"
              aria-label="View notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <BellIcon className="h-4 w-4" />
            </button>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
            {notificationsOpen ? (
              <div
                className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
                onMouseLeave={() => setNotificationsOpen(false)}
              >
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <p className="text-xs text-slate-500">{unreadCount} unread</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                    onClick={() => readAllMutation.mutate()}
                    disabled={readAllMutation.isPending || unreadCount === 0}
                  >
                    Mark all read
                  </button>
                </div>
                {!browserNotificationsEnabled ? (
                  <button
                    type="button"
                    className="mx-3 mt-3 flex w-[calc(100%-24px)] items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs font-semibold text-primary transition hover:bg-primary/10"
                    onClick={enableBrowserNotifications}
                  >
                    Enable browser reminders
                    <span aria-hidden>→</span>
                  </button>
                ) : null}
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {notificationsQuery.isLoading ? (
                    <p className="px-3 py-8 text-center text-sm text-slate-500">Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
                  ) : notifications.slice(0, 8).map((notification) => (
                    <div
                      key={notification.id}
                      className="group flex gap-3 rounded-2xl px-3 py-3 transition hover:bg-elevated"
                    >
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openNotification(notification)}>
                        <div className="flex items-start gap-2">
                          {notification.unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /> : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border" />}
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{notification.subject}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notification.message}</p>
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{formatNotificationTime(notification.sentAt)}</p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="h-7 shrink-0 rounded-full px-2 text-xs font-semibold text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => clearMutation.mutate(notification.id)}
                        disabled={clearMutation.isPending}
                      >
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "Just now"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}
