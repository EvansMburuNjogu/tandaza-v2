"use client"

import { useEffect, useState } from "react"
import { MoonIcon, SunIcon } from "@/components/ui/icons"

type ThemeMode = "light" | "dark"

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light"
  return (window.localStorage.getItem("tandaza-theme") as ThemeMode) || "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light")

  useEffect(() => {
    const stored = getStoredTheme()
    setTheme(stored)
    // Only set theme if not already set by layout script
    if (!document.documentElement.getAttribute("data-theme")) {
      document.documentElement.setAttribute("data-theme", stored)
    }
  }, [])

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    document.documentElement.setAttribute("data-theme", next)
    window.localStorage.setItem("tandaza-theme", next)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-slate-500 shadow-sm transition hover:border-primary/20 hover:text-foreground"
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      {theme === "light" ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
    </button>
  )
}
