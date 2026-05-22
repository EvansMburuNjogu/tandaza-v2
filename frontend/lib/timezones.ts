const fallbackTimezones = [
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Addis_Ababa",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Dar_es_Salaam",
  "Africa/Johannesburg",
  "Africa/Kampala",
  "Africa/Kigali",
  "Africa/Lagos",
  "Africa/Luanda",
  "Africa/Nairobi",
  "Africa/Tunis"
]

export function timezoneOptions(selected?: string) {
  const supported = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : fallbackTimezones
  const options = [...supported]
  if (selected && !options.includes(selected)) {
    options.unshift(selected)
  }
  return options
}
