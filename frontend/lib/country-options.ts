import { CountryRecord } from "@/lib/api/contracts"

export function availableCountries(countries?: CountryRecord[]) {
  return (countries || []).filter((country) => country.active)
}

export function countryFallback(countries?: CountryRecord[], preferredCode?: string) {
  const activeCountries = availableCountries(countries)
  return (
    activeCountries.find((country) => country.code === preferredCode) ||
    activeCountries.find((country) => country.code === "KE") ||
    activeCountries[0]
  )
}

export function countryDefaults(countries: CountryRecord[] | undefined, code: string) {
  const country = countryFallback(countries, code)
  return {
    countryCode: country?.code || "KE",
    currencyCode: country?.defaultCurrency || "KES",
    timezone: country?.defaultTimezone || "Africa/Nairobi"
  }
}
