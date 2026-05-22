export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function formatNumber(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat().format(safeValue)
}

export function formatCurrency(value: number, currency = "KES") {
  const code = (currency || "KES").toUpperCase()
  const localeMap: Record<string, string> = {
    KES: "en-KE",
    GHS: "en-GH",
    NGN: "en-NG",
    ZAR: "en-ZA",
    USD: "en-US",
    EUR: "en-IE",
    GBP: "en-GB"
  }
  const safeValue = Number.isFinite(value) ? value : 0

  return `${code} ${new Intl.NumberFormat(localeMap[code] || "en", {
    maximumFractionDigits: 0
  }).format(safeValue)}`
}

export function formatDate(date?: string | null) {
  if (!date) return "Not available"
  const parsed = new Date(date)
  if (!Number.isFinite(parsed.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed)
}

export function safeDisplay(value?: string | null, fallback = "Not available") {
  const text = String(value || "").trim()
  if (!text || /^pii:[a-f0-9]+$/i.test(text)) return fallback
  return text
}

export function mediaUrl(value?: string | null) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw
  if (raw.startsWith("/api/backend/")) return raw
  if (raw.startsWith("/uploads/")) return `/api/backend${raw}`
  if (raw.startsWith("/media/")) return `/api/backend${raw}`
  return raw.startsWith("/") ? raw : `/api/backend/media/${raw}`
}
