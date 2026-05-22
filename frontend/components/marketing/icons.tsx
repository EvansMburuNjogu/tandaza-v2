/* Inline SVG icon set for marketing pages — 20×20 stroke style */

const s = { stroke: "currentColor", strokeWidth: 1.4, fill: "none" } as const
const r = { ...s, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

export function IconMap() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2V5z" {...r} />
      <path d="M8 3v12M12 5v12" strokeLinecap="round" stroke="currentColor" strokeWidth={1.4} fill="none" />
    </svg>
  )
}

export function IconClipboard() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <rect x="5" y="3" width="10" height="14" rx="1.5" {...r} />
      <path d="M8 3a2 2 0 004 0" {...r} />
      <path d="M7 9h6M7 12h4" {...r} />
    </svg>
  )
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" {...r} />
      <path d="M7 2v4M13 2v4M3 8h14" {...r} />
    </svg>
  )
}

export function IconBell() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z" {...r} />
      <path d="M8 17a2 2 0 004 0" {...r} />
    </svg>
  )
}

export function IconCreditCard() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <rect x="2" y="5" width="16" height="11" rx="1.5" {...r} />
      <path d="M2 9h16M5 13h3" {...r} />
    </svg>
  )
}

export function IconFileInvoice() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M12 3H6a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 006 17h8a1.5 1.5 0 001.5-1.5V7.5L12 3z" {...r} />
      <path d="M12 3v4.5H16.5M7 11h6M7 14h4" {...r} />
    </svg>
  )
}

export function IconBarChart() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M3 16h14" {...r} />
      <rect x="4" y="10" width="3" height="6" rx="0.5" {...r} />
      <rect x="8.5" y="7" width="3" height="9" rx="0.5" {...r} />
      <rect x="13" y="4" width="3" height="12" rx="0.5" {...r} />
    </svg>
  )
}

export function IconBank() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M3 8.5l7-5 7 5H3z" {...r} />
      <path d="M5 8.5v7M10 8.5v7M15 8.5v7M3 15.5h14" {...r} />
    </svg>
  )
}

export function IconTicket() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M2 7.5C3.1 7.5 4 6.6 4 5.5H16c0 1.1.9 2 2 2v4c-1.1 0-2 .9-2 2H4c0-1.1-.9-2-2-2v-4z" {...r} />
      <path d="M13 5.5v9" strokeLinecap="round" stroke="currentColor" strokeWidth={1.4} strokeDasharray="2 2" fill="none" />
    </svg>
  )
}

export function IconSearch() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <circle cx="9" cy="9" r="5.5" {...r} />
      <path d="M13 13l3.5 3.5" {...r} />
    </svg>
  )
}

export function IconPhone() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <rect x="5.5" y="2" width="9" height="16" rx="2" {...r} />
      <path d="M9 15.5h2" {...r} />
    </svg>
  )
}

export function IconStar() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M10 2l2.4 5 5.6.8-4 3.9 1 5.3-5-2.6-5 2.6.9-5.3-4-3.9 5.6-.8L10 2z" {...r} />
    </svg>
  )
}

export function IconTrendUp() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M2 14l5-5 4 3 7-8" {...r} />
      <path d="M14 4h4v4" {...r} />
    </svg>
  )
}

export function IconStore() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M3 9h14v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" {...r} />
      <path d="M1.5 5.5h17L17 9H3L1.5 5.5z" {...r} />
      <path d="M8 18v-5h4v5" {...r} />
    </svg>
  )
}

export function IconLightbulb() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M10 2a5 5 0 015 5c0 2.2-1.2 3.8-2.5 5H7.5C6.2 10.8 5 9.2 5 7a5 5 0 015-5z" {...r} />
      <path d="M7.5 12.5V14a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-1.5" {...r} />
      <path d="M8.5 14.5V16h3v-1.5" {...r} />
    </svg>
  )
}

export function IconGlobe() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <circle cx="10" cy="10" r="7.5" {...r} />
      <path d="M10 2.5c-2.8 2.2-4 4.7-4 7.5s1.2 5.3 4 7.5M10 2.5c2.8 2.2 4 4.7 4 7.5s-1.2 5.3-4 7.5" {...r} />
      <path d="M2.5 10h15" {...r} />
    </svg>
  )
}

export function IconLock() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <rect x="4" y="9" width="12" height="8" rx="1.5" {...r} />
      <path d="M7 9V6.5a3 3 0 016 0V9" {...r} />
      <circle cx="10" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconTarget() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <circle cx="10" cy="10" r="7.5" {...r} />
      <circle cx="10" cy="10" r="4" {...r} />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPackage() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M10 2l7 4v8l-7 4-7-4V6l7-4z" {...r} />
      <path d="M10 2v14M3 6l7 4 7-4" {...r} />
    </svg>
  )
}

export function IconDocument() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M12 3H6a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 006 17h8a1.5 1.5 0 001.5-1.5V7.5L12 3z" {...r} />
      <path d="M12 3v4.5H16.5M7 11h6M7 14h4" {...r} />
    </svg>
  )
}

export function IconChat() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M3 5h14a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 2.5V6a1 1 0 011-1z" {...r} />
    </svg>
  )
}

export function IconRepeat() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M4 10a6 6 0 016-6h4" {...r} />
      <path d="M16 10a6 6 0 01-6 6H6" {...r} />
      <path d="M12 2l2 2-2 2M8 18l-2-2 2-2" {...r} />
    </svg>
  )
}

export function IconBookmark() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M5 3h10a1 1 0 011 1v13l-6-4-6 4V4a1 1 0 011-1z" {...r} />
    </svg>
  )
}

export function IconIdCard() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <rect x="2" y="5" width="16" height="11" rx="1.5" {...r} />
      <circle cx="7.5" cy="10.5" r="2" {...r} />
      <path d="M11.5 9h4M11.5 12h3" {...r} />
    </svg>
  )
}

export function IconUsers() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <circle cx="8" cy="7" r="3" {...r} />
      <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" {...r} />
      <path d="M14 5a3 3 0 010 6M18 17c0-2.8-1.8-5.2-4.3-6" {...r} />
    </svg>
  )
}

export function IconAnalytics() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M2 14l4-5 4 3 4-6 4 4" {...r} />
    </svg>
  )
}

export function IconHandshake() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden {...s}>
      <path d="M2 12l3-3 3 2 5-5 3 1" {...r} />
      <path d="M5 9L3 13l2 3 4-3 5 3 3-4-3-2" {...r} />
    </svg>
  )
}
