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

function organizerPageKey(pathname: string) {
  if (pathname === "/organizer") return "home"
  if (pathname === "/organizer/expos") return "expos"
  if (pathname === "/organizer/expos/new") return "expo-new"
  if (/^\/organizer\/expos\/[^/]+\/edit/.test(pathname)) return "expo-edit"
  if (/^\/organizer\/expos\/[^/]+/.test(pathname)) return "expo-detail"
  if (pathname === "/organizer/exhibitors") return "exhibitors"
  if (pathname === "/organizer/exhibitors/invite") return "exhibitor-invite"
  if (pathname === "/organizer/visitors") return "visitors"
  if (pathname === "/organizer/payments") return "payments"
  if (/^\/organizer\/payments\/[^/]+\/receipt/.test(pathname)) return "payment-receipt"
  if (pathname === "/organizer/settlements") return "settlements"
  if (/^\/organizer\/settlements\/[^/]+/.test(pathname)) return "settlement-detail"
  if (pathname === "/organizer/reports") return "reports"
  if (pathname === "/organizer/feedback") return "feedback"
  if (pathname === "/organizer/team") return "team"
  if (pathname === "/organizer/team/new") return "team-new"
  if (/^\/organizer\/team\/[^/]+\/edit/.test(pathname)) return "team-edit"
  if (/^\/organizer\/team\/[^/]+/.test(pathname)) return "team-detail"
  if (pathname === "/organizer/sponsors") return "sponsors"
  if (pathname === "/organizer/sponsors/invite") return "sponsor-invite"
  if (/^\/organizer\/sponsors\/[^/]+\/edit/.test(pathname)) return "sponsor-edit"
  if (/^\/organizer\/sponsors\/[^/]+/.test(pathname)) return "sponsor-detail"
  if (pathname === "/organizer/settings") return "settings"
  return "workspace"
}

function exhibitorPageKey(pathname: string) {
  if (pathname === "/exhibitor") return "home"
  if (pathname === "/exhibitor/expos") return "browse-expos"
  if (/^\/exhibitor\/expos\/[^/]+/.test(pathname)) return "activate-expo"
  if (pathname === "/exhibitor/my-expos") return "my-expos"
  if (/^\/exhibitor\/my-expos\/[^/]+/.test(pathname)) return "expo-workspace"
  if (pathname === "/exhibitor/products") return "products"
  if (pathname === "/exhibitor/products/new") return "product-new"
  if (/^\/exhibitor\/products\/[^/]+/.test(pathname)) return "product-detail"
  if (pathname === "/exhibitor/payments") return "payments"
  if (/^\/exhibitor\/payments\/[^/]+\/receipt/.test(pathname)) return "payment-receipt"
  if (pathname === "/exhibitor/settings") return "settings"
  return "workspace"
}

function accountPageSteps(role: "organizer" | "exhibitor", pathname: string): TourStep[] {
  const pageKey = role === "organizer" ? organizerPageKey(pathname) : exhibitorPageKey(pathname)
  const baseSteps = [
    role === "organizer"
      ? { element: "[data-tour='sidebar']", title: "Organizer navigation", intro: "Use this menu to manage expo operations, revenue, reports, feedback, team members, and settings." }
      : { element: "[data-tour='sidebar']", title: "Exhibitor navigation", intro: "Use this menu to manage activated expos, products, payments, company settings, and expo opportunities." },
    { element: "[data-tour='topbar']", title: "Current page", intro: "The top bar confirms where you are and keeps notifications and account actions close." }
  ]

  const organizerSteps: Record<string, TourStep> = {
    home: { element: "[data-tour='workspace']", title: "Organizer overview", intro: "Track expo activity, visitor engagement, exhibitor performance, payments, and tasks that need attention." },
    expos: { element: "[data-tour='workspace']", title: "My expos", intro: "View your expos, create drafts, submit for review, and open expo performance details." },
    "expo-new": { element: "[data-tour='workspace']", title: "Create expo draft", intro: "Add the expo details. Admin approval controls publishing, pricing, and final activation." },
    "expo-edit": { element: "[data-tour='workspace']", title: "Edit expo", intro: "Update draft or requested-change expo information before submitting it again." },
    "expo-detail": { element: "[data-tour='workspace']", title: "Expo detail", intro: "Review exhibitors, visitors, payments, feedback, analytics, and daily performance for this expo." },
    exhibitors: { element: "[data-tour='workspace']", title: "Exhibitors", intro: "See exhibitors connected to your expos and invite new companies when needed." },
    "exhibitor-invite": { element: "[data-tour='workspace']", title: "Invite exhibitor", intro: "Create an exhibitor account and send onboarding emails with temporary access details." },
    visitors: { element: "[data-tour='workspace']", title: "Visitors", intro: "Review visitors who engaged with your expos and open the expo list behind each visit count." },
    payments: { element: "[data-tour='workspace']", title: "Payments", intro: "Track activation payments, receipts, and revenue generated through your expos." },
    "payment-receipt": { element: "[data-tour='workspace']", title: "Receipt", intro: "Review the payment receipt details before downloading or printing." },
    settlements: { element: "[data-tour='workspace']", title: "Settlements", intro: "Follow commission settlements and payout status for your expos." },
    "settlement-detail": { element: "[data-tour='workspace']", title: "Settlement invoice", intro: "Review aggregated expo commission amounts and payout method details." },
    reports: { element: "[data-tour='workspace']", title: "Reports", intro: "Use aggregated expo, exhibitor, visitor, payment, settlement, and daily performance analytics." },
    feedback: { element: "[data-tour='workspace']", title: "Feedback", intro: "Read exhibitor feedback, ratings, comments, dislikes, and improvement suggestions." },
    team: { element: "[data-tour='workspace']", title: "Team", intro: "Manage organizer portal users for your company. Main organizers can add or remove team members." },
    "team-new": { element: "[data-tour='workspace']", title: "Add team member", intro: "Create a teammate login with a temporary password and first-login password change." },
    "team-edit": { element: "[data-tour='workspace']", title: "Edit team member", intro: "Update team member access details when needed." },
    "team-detail": { element: "[data-tour='workspace']", title: "Team member", intro: "Review teammate profile and access information." },
    sponsors: { element: "[data-tour='workspace']", title: "Sponsors", intro: "View sponsor relationships connected to your expo operations." },
    "sponsor-invite": { element: "[data-tour='workspace']", title: "Invite sponsor", intro: "Sponsor inviting is controlled carefully so commissions and access stay traceable." },
    "sponsor-detail": { element: "[data-tour='workspace']", title: "Sponsor detail", intro: "Review sponsor profile and connected opportunities." },
    "sponsor-edit": { element: "[data-tour='workspace']", title: "Edit sponsor", intro: "Update sponsor details where organizer controls are allowed." },
    settings: { element: "[data-tour='workspace']", title: "Organizer settings", intro: "Update your organizer profile, logo, payout method, and company details." },
    workspace: { element: "[data-tour='workspace']", title: "Organizer workspace", intro: "Use this page to continue managing your expo operations." }
  }

  const exhibitorSteps: Record<string, TourStep> = {
    home: { element: "[data-tour='workspace']", title: "Exhibitor overview", intro: "Track leads, meetings, follow-ups, activated expos, products, and sales activity." },
    "browse-expos": { element: "[data-tour='workspace']", title: "Browse expos", intro: "Find expos your company can activate and review the one-off activation details." },
    "activate-expo": { element: "[data-tour='workspace']", title: "Activate expo", intro: "Review the expo, activation fee, optional add-ons, ROI estimate, and Paystack checkout options." },
    "my-expos": { element: "[data-tour='workspace']", title: "My expos", intro: "Open activated expo workspaces where your company can manage visitors, products, leads, and analytics." },
    "expo-workspace": { element: "[data-tour='workspace']", title: "Expo workspace", intro: "Manage QR access, leads, meetings, pre-orders, products, documents, feedback, ads, conversations, live stream, and analytics." },
    products: { element: "[data-tour='workspace']", title: "Products", intro: "Manage your company product catalog before showcasing selected products in expo workspaces." },
    "product-new": { element: "[data-tour='workspace']", title: "Add product", intro: "Add product details, category, pricing, demo video, presentation material, and up to five images." },
    "product-detail": { element: "[data-tour='workspace']", title: "Product detail", intro: "Review product information, images, specifications, demo video, files, price, and discount." },
    payments: { element: "[data-tour='workspace']", title: "Payments", intro: "Track activation payments, add-ons, receipts, and payment status for your company." },
    "payment-receipt": { element: "[data-tour='workspace']", title: "Receipt", intro: "Review payment receipt details, add-ons, and downloadable proof of payment." },
    settings: { element: "[data-tour='workspace']", title: "Company settings", intro: "Update company profile, logo, documents, team members, meeting categories, website, and social links." },
    workspace: { element: "[data-tour='workspace']", title: "Exhibitor workspace", intro: "Use this page to continue managing your company activity." }
  }

  const pageStep = role === "organizer"
    ? organizerSteps[pageKey] || organizerSteps.workspace
    : exhibitorSteps[pageKey] || exhibitorSteps.workspace

  return [
    ...baseSteps,
    pageStep,
    { element: "[data-tour='notifications']", title: "Notifications", intro: "New activity, reminders, messages, payment updates, and account notices appear here." },
    { element: "[data-tour='profile-menu']", title: "Profile", intro: "Open your profile menu for account actions or sign out." }
  ]
}

export function TandazaIntroTour({ role }: { role: TourRole }) {
  const pathname = usePathname()
  const pageKey = role === "visitor"
    ? visitorPageKey(pathname)
    : role === "organizer"
      ? organizerPageKey(pathname)
      : exhibitorPageKey(pathname)
  const storageKey = `tandaza:intro:${role}:${pageKey}:seen`
  const steps = useMemo(() => {
    if (role === "visitor") return visitorPageSteps(pathname)
    return accountPageSteps(role, pathname)
  }, [pathname, role])

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
