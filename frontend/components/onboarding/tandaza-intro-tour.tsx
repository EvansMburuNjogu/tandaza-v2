"use client"

import { useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"

type TourRole = "visitor" | "organizer" | "exhibitor"

type TourStep = {
  element?: string
  intro: string
  title?: string
}

const roleLabels: Record<TourRole, string> = {
  visitor: "visitor account",
  organizer: "organizer workspace",
  exhibitor: "exhibitor workspace"
}

const roleSteps: Record<TourRole, TourStep[]> = {
  visitor: [
    { element: "[data-tour='sidebar']", title: "Your navigation", intro: "Move between expos, favorites, calendar, activity, and profile settings from here." },
    { element: "[data-tour='topbar']", title: "Current page", intro: "The top bar shows where you are and keeps notifications and your profile close." },
    { element: "[data-tour='workspace']", title: "Start here", intro: "Browse expos, open exhibitors, request meetings, chat, save favorites, and track your activity." },
    { element: "[data-tour='notifications']", title: "Reminders", intro: "Meeting updates, replies, and reminders appear here. Enable browser reminders when prompted." },
    { element: "[data-tour='profile-menu']", title: "Profile", intro: "Update your contact details, industry, and sign out from your profile menu." }
  ],
  organizer: [
    { element: "[data-tour='sidebar']", title: "Organizer sections", intro: "Manage expos, exhibitors, visitors, payments, settlements, reports, feedback, team members, and settings." },
    { element: "[data-tour='topbar']", title: "Page context", intro: "The top bar confirms the page you are viewing and keeps notifications and account actions nearby." },
    { element: "[data-tour='workspace']", title: "Expo operations", intro: "Create expo drafts, review performance, manage exhibitors, and follow visitor engagement here." },
    { element: "[data-tour='notifications']", title: "Operational alerts", intro: "Expo submissions, payment updates, settlement notices, and team updates appear here." },
    { element: "[data-tour='profile-menu']", title: "Account settings", intro: "Open your profile menu to manage your account or sign out." }
  ],
  exhibitor: [
    { element: "[data-tour='sidebar']", title: "Exhibitor tools", intro: "Open your dashboard, browse expos, manage activated expos, products, payments, and company settings." },
    { element: "[data-tour='topbar']", title: "Workspace header", intro: "The top bar keeps notifications, reminders, and your profile available while you work." },
    { element: "[data-tour='workspace']", title: "Sales workspace", intro: "Activate expos, showcase products, manage leads, meetings, pre-orders, documents, conversations, ads, and analytics." },
    { element: "[data-tour='notifications']", title: "Lead and meeting alerts", intro: "New visitor interest, chats, meetings, reminders, and payment receipts appear here." },
    { element: "[data-tour='profile-menu']", title: "Company access", intro: "Use your profile menu for account actions. Company settings live in the sidebar." }
  ]
}

function visitorPageKey(pathname: string) {
  if (pathname === "/visitor") return "home"
  if (pathname === "/visitor/expos") return "expos"
  if (/^\/visitor\/expos\/[^/]+\/exhibitors\/[^/]+/.test(pathname)) return "exhibitor"
  if (/^\/visitor\/expos\/[^/]+/.test(pathname)) return "expo-detail"
  if (pathname === "/visitor/favorites") return "favorites"
  if (pathname === "/visitor/calendar") return "calendar"
  if (pathname === "/visitor/settings") return "settings"
  if (pathname === "/visitor/timeline") return "activity"
  return "workspace"
}

function visitorPageSteps(pathname: string): TourStep[] {
  const baseSteps = [
    { element: "[data-tour='sidebar']", title: "Your navigation", intro: "Move between expos, favorites, calendar, activity, and profile settings from here." },
    { element: "[data-tour='topbar']", title: "Current page", intro: "The top bar keeps notifications and your profile close while you explore." }
  ]

  const pageKey = visitorPageKey(pathname)
  const pageSteps: Record<string, TourStep> = {
    home: { element: "[data-tour='workspace']", title: "Visitor home", intro: "Start with live expos, upcoming expos, meetings, and your most recent activity." },
    expos: { element: "[data-tour='workspace']", title: "Find expos", intro: "Search expos, open an expo, then browse exhibitors and the day-by-day timeline." },
    "expo-detail": { element: "[data-tour='workspace']", title: "Expo view", intro: "Review expo details, see exhibitors, open their profiles, and follow the timeline for this expo." },
    exhibitor: { element: "[data-tour='workspace']", title: "Exhibitor profile", intro: "View company details, chat, request a meeting, explore products, download files, and leave feedback." },
    favorites: { element: "[data-tour='workspace']", title: "Favorites", intro: "Your saved exhibitors live here so you can return to them quickly." },
    calendar: { element: "[data-tour='workspace']", title: "Calendar", intro: "Track upcoming meetings and open a meeting to view details or join from the link." },
    settings: { element: "[data-tour='workspace']", title: "Profile settings", intro: "Keep your name, contact details, country code, and industry up to date." },
    activity: { element: "[data-tour='workspace']", title: "Activity", intro: "Review your expo activity from latest to oldest." },
    workspace: { element: "[data-tour='workspace']", title: "Workspace", intro: "Use this page to continue your expo journey." }
  }

  return [
    ...baseSteps,
    pageSteps[pageKey] || pageSteps.workspace,
    { element: "[data-tour='notifications']", title: "Reminders", intro: "Meeting updates, replies, and reminders appear here. Enable browser reminders when prompted." },
    { element: "[data-tour='profile-menu']", title: "Profile", intro: "Update your account or sign out from your profile menu." }
  ]
}

export function TandazaIntroTour({ role }: { role: TourRole }) {
  const pathname = usePathname()
  const pageKey = role === "visitor" ? visitorPageKey(pathname) : "workspace"
  const storageKey = `tandaza:intro:${role}:${pageKey}:seen`
  const steps = useMemo(() => role === "visitor" ? visitorPageSteps(pathname) : roleSteps[role], [pathname, role])

  useEffect(() => {
    let cancelled = false
    if (window.localStorage.getItem(storageKey) === "true") return

    const timeout = window.setTimeout(() => {
      if (!cancelled) void startTour()
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, steps])

  async function startTour() {
    const availableSteps = steps.filter((step) => !step.element || document.querySelector(step.element))
    if (availableSteps.length === 0) return

    const introModule = await import("intro.js")
    const tour = introModule.default()
    tour.setOptions({
      steps: availableSteps,
      nextLabel: "Next",
      prevLabel: "Back",
      doneLabel: "Done",
      exitOnOverlayClick: false,
      scrollToElement: true,
      showProgress: true,
      showBullets: false,
      tooltipClass: "tandaza-intro-tooltip",
      highlightClass: "tandaza-intro-highlight"
    })
    tour.oncomplete(() => window.localStorage.setItem(storageKey, "true"))
    tour.onexit(() => window.localStorage.setItem(storageKey, "true"))
    tour.start()
  }

  return (
    <button
      type="button"
      onClick={startTour}
      className="fixed bottom-24 right-4 z-[70] rounded-full border border-primary/20 bg-card/95 px-4 py-2 text-xs font-semibold text-primary shadow-card backdrop-blur transition hover:border-primary/35 hover:bg-primary hover:text-white focus:outline-none focus:ring-4 focus:ring-primary/15 lg:bottom-5"
      aria-label={`Open ${roleLabels[role]} guide`}
    >
      Guide
    </button>
  )
}
