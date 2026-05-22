import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        cardForeground: "hsl(var(--card-foreground))",
        elevated: "hsl(var(--elevated))",
        sidebar: "hsl(var(--sidebar))",
        sidebarForeground: "hsl(var(--sidebar-foreground))",
        primary: "hsl(var(--primary))",
        primaryForeground: "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        ring: "hsl(var(--ring))"
      },
      boxShadow: {
        shell: "0 30px 80px rgba(15, 23, 42, 0.12)",
        card: "0 14px 36px rgba(15, 23, 42, 0.08)",
        float: "0 22px 48px rgba(15, 23, 42, 0.14)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem"
      }
    }
  },
  plugins: []
}

export default config
