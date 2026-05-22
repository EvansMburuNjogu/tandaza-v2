"use client"

import { create } from "zustand"

type AdminCountryState = {
  selectedCountry: string
  hydrated: boolean
  setSelectedCountry: (countryCode: string) => void
  hydrateCountry: () => void
}

export const allCountriesCode = "ALL"

export const useAdminCountryStore = create<AdminCountryState>()((set) => ({
  selectedCountry: allCountriesCode,
  hydrated: false,
  setSelectedCountry: (countryCode) => {
    const next = countryCode || allCountriesCode
    window.localStorage.setItem("tandaza-admin-country", next)
    set({ selectedCountry: next, hydrated: true })
  },
  hydrateCountry: () => {
    const stored = window.localStorage.getItem("tandaza-admin-country") || allCountriesCode
    set({ selectedCountry: stored, hydrated: true })
  }
}))
