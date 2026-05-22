"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Email", value: "email", href: "/administrator/settings?tab=email" },
  { label: "SMS", value: "sms", href: "/administrator/settings?tab=sms" },
  { label: "WhatsApp", value: "whatsapp", href: "/administrator/settings?tab=whatsapp" },
  { label: "Paystack", value: "paystack", href: "/administrator/settings?tab=paystack" },
  { label: "Google", value: "google", href: "/administrator/settings?tab=google" },
  { label: "Meetings", value: "meetings", href: "/administrator/settings?tab=meetings" },
  { label: "OpenAI", value: "openai", href: "/administrator/settings?tab=openai" }
]

export function SettingsTabs({ currentTab }: { currentTab: string }) {
  const current = currentTab || "email"

  return (
    <div className="flex w-full flex-wrap gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm md:inline-flex md:w-auto">
      {tabs.map((tab) => {
        const active = current === tab.value
        return (
          <Link
            key={tab.value}
            href={tab.href}
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
              active ? "bg-primary text-primaryForeground shadow-sm" : "text-slate-500 hover:bg-secondary hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
