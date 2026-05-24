"use client"

import { useEffect, useMemo } from "react"

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

export function TandazaIntroTour({ role }: { role: TourRole }) {
  const storageKey = `tandaza:intro:${role}:seen`
  const steps = useMemo(() => roleSteps[role], [role])

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
