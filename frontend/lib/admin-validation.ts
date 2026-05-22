import { toast } from "sonner"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const countryCodePattern = /^[A-Z]{2}$/
const currencyCodePattern = /^[A-Z]{3}$/
const timezonePattern = /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const userIDPattern = /^usr_[a-z0-9_]+$/i

function fail(title: string, description: string) {
  toast.error(title, { description })
  return false
}

function clean(value: unknown) {
  return String(value ?? "").trim()
}

export function validateAdminAccountInput(input: {
  name: string
  email: string
  company?: string
  password?: string
}) {
  if (clean(input.name).length < 2) {
    return fail("Check the name", "Names must be at least 2 characters.")
  }
  if (input.company !== undefined && clean(input.company).length < 2) {
    return fail("Check the company", "Company names must be at least 2 characters.")
  }
  if (!emailPattern.test(clean(input.email))) {
    return fail("Check the email", "Enter a valid email address.")
  }
  if (input.password !== undefined && clean(input.password).length < 8) {
    return fail("Check the password", "Temporary passwords must be at least 8 characters.")
  }
  if (input.password !== undefined && clean(input.password).toLowerCase() === clean(input.email).toLowerCase()) {
    return fail("Check the password", "Temporary password cannot be the same as the email address.")
  }
  return true
}

export function validateSponsorPlanInput(input: {
  name: string
  currency: string
  price: number
  organizerCommissionPercent: number
}) {
  if (clean(input.name).length < 2) {
    return fail("Check the plan name", "Sponsor plan names must be at least 2 characters.")
  }
  if (!currencyCodePattern.test(clean(input.currency).toUpperCase())) {
    return fail("Check the currency", "Currency must be a 3-letter code such as KES, GHS, NGN, or ZAR.")
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    return fail("Check the price", "Price must be zero or greater.")
  }
  if (!Number.isFinite(input.organizerCommissionPercent) || input.organizerCommissionPercent < 0 || input.organizerCommissionPercent > 100) {
    return fail("Check the commission", "Organizer commission must be between 0 and 100 percent.")
  }
  return true
}

export function validateExpoInput(input: {
  name: string
  description: string
  organizerId: string
  countryCode: string
  city: string
  venue: string
  currencyCode: string
  timezone: string
  activationFee: string
  adsAddonFee?: string
  commissionRate: string
  startDate: string
  endDate: string
}) {
  if (clean(input.name).length < 3) return fail("Check the expo name", "Expo names must be at least 3 characters.")
  if (clean(input.description).length < 10) return fail("Check the description", "Expo descriptions must be at least 10 characters.")
  if (!userIDPattern.test(clean(input.organizerId))) return fail("Check the organizer", "Organizer ID must look like usr_organizer_001.")
  if (!countryCodePattern.test(clean(input.countryCode).toUpperCase())) return fail("Check the country", "Country must be a 2-letter code such as KE or GH.")
  if (clean(input.city).length < 2) return fail("Check the city", "City must be at least 2 characters.")
  if (clean(input.venue).length < 2) return fail("Check the venue", "Venue must be at least 2 characters.")
  if (!currencyCodePattern.test(clean(input.currencyCode).toUpperCase())) return fail("Check the currency", "Currency must be a 3-letter code such as KES, GHS, NGN, or ZAR.")
  if (!timezonePattern.test(clean(input.timezone))) return fail("Check the timezone", "Use an IANA timezone such as Africa/Nairobi.")

  const activationFee = Number(input.activationFee)
  const adsAddonFee = Number(input.adsAddonFee || 0)
  const commissionRate = Number(input.commissionRate)
  if (!Number.isFinite(activationFee) || activationFee < 0) return fail("Check the activation fee", "Activation fee must be zero or greater.")
  if (!Number.isFinite(adsAddonFee) || adsAddonFee < 0) return fail("Check the ads add-on fee", "Ads add-on fee must be zero or greater.")
  if (!Number.isInteger(activationFee)) return fail("Check the activation fee", "Activation fee must be a whole amount, for example 20.")
  if (!Number.isInteger(adsAddonFee)) return fail("Check the ads add-on fee", "Ads add-on fee must be a whole amount, for example 10.")
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) return fail("Check the commission", "Organizer commission must be between 0 and 100 percent.")

  const start = new Date(input.startDate)
  const end = new Date(input.endDate)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return fail("Check the expo dates", "Start and end dates are required.")
  if (end < start) return fail("Check the expo dates", "End date cannot be before the start date.")
  return true
}

export function validateCountryInput(input: {
  code: string
  name: string
  defaultCurrency: string
  defaultTimezone: string
  paymentMethods: string[]
}) {
  if (!countryCodePattern.test(clean(input.code).toUpperCase())) return fail("Check the country code", "Country code must be exactly 2 letters.")
  if (clean(input.name).length < 2) return fail("Check the country name", "Country name must be at least 2 characters.")
  if (!currencyCodePattern.test(clean(input.defaultCurrency).toUpperCase())) return fail("Check the currency", "Currency must be exactly 3 letters.")
  if (!timezonePattern.test(clean(input.defaultTimezone))) return fail("Check the timezone", "Use an IANA timezone such as Africa/Kampala.")
  if (!input.paymentMethods.length) return fail("Check payment methods", "Add at least one payment method.")
  return true
}

export function validateCategoryInput(input: { name: string; slug: string; icon?: string }) {
  if (clean(input.name).length < 2) return fail("Check the category name", "Category names must be at least 2 characters.")
  if (clean(input.slug) && !slugPattern.test(clean(input.slug))) return fail("Check the slug", "Slug can only use lowercase letters, numbers, and hyphens.")
  return true
}

export function validateUrlValue(label: string, value: string) {
  if (!clean(value)) return true
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid protocol")
    return true
  } catch {
    return fail(`Check ${label}`, `${label} must be a valid URL.`)
  }
}
