"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SessionGuard } from "@/components/auth/session-guard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { callingCodeOptions } from "@/lib/calling-codes"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"

const INDUSTRY_OPTIONS = [
  "Agriculture",
  "Construction",
  "Education",
  "Energy",
  "Financial Services",
  "Food & Beverage",
  "Healthcare",
  "Hospitality",
  "Manufacturing",
  "Media & Creative",
  "Non-profit",
  "Professional Services",
  "Real Estate",
  "Retail & Ecommerce",
  "Technology",
  "Transport & Logistics",
  "Travel & Tourism"
]

export default function VisitorSettingsPage() {
  const token = useSessionStore((s) => s.token)
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    industry: ""
  })
  const [callingCode, setCallingCode] = useState("+254")
  const [phoneLocal, setPhoneLocal] = useState("")
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    expoUpdates: true,
    reminders: true
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ["visitor-settings"],
    queryFn: () => api.getVisitorSettings(token || ""),
    enabled: Boolean(token)
  })

  useEffect(() => {
    if (!settings) return
    const phoneParts = splitPhone(settings.phone || "")
    setForm({
      name: settings.name,
      email: settings.email,
      company: settings.company || "",
      industry: settings.industry || ""
    })
    setCallingCode(phoneParts.code)
    setPhoneLocal(phoneParts.local)
    setNotifications({
      email: settings.notifications.email,
      push: settings.notifications.push,
      expoUpdates: settings.notifications.expoUpdates ?? true,
      reminders: settings.notifications.reminders
    })
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; company: string; industry: string; notifications: typeof notifications }) => api.updateVisitorSettings(token || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-settings"] })
      toast.success("Profile saved")
    },
    onError: (error) => {
      toast.error("Could not save profile", { description: error instanceof Error ? error.message : "Please check your details and try again." })
    }
  })

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) {
      toast.error("Could not save profile", { description: "Enter your full name." })
      return
    }
    const localPhone = phoneLocal.replace(/[^\d]/g, "")
    const phone = localPhone ? `${callingCode}${localPhone}` : ""
    updateMutation.mutate({
      name,
      company: form.company.trim(),
      industry: form.industry.trim(),
      phone,
      notifications
    })
  }

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-muted">Loading settings...</p>
      </div>
    )
  }

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden">
        <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),linear-gradient(135deg,#ffffff,#faf8ff_62%,#f8fafc)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">Account</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
              <p className="mt-2 text-sm text-muted">Keep your details clear for meetings and exhibitor follow-up.</p>
            </div>
            <div className="rounded-2xl bg-white/75 px-4 py-3 shadow-sm ring-1 ring-white/80">
              <p className="text-xs font-medium text-muted">Signed in as</p>
              <p className="mt-1 max-w-48 truncate text-sm font-semibold text-foreground">{settings.email}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Profile details</h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-muted">Used for exhibitor follow-up, meeting reminders, and better expo recommendations.</p>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="visitorName" className="text-sm font-medium text-foreground">Full Name <span className="text-primary" aria-hidden>*</span></label>
                <Input
                  id="visitorName"
                  required
                  aria-required="true"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Jane Wanjiku"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="visitorEmail" className="text-sm font-medium text-foreground">Email</label>
                <Input
                  id="visitorEmail"
                  value={form.email}
                  type="email"
                  readOnly
                  aria-readonly="true"
                  className="bg-elevated/60 text-muted"
                />
                <p className="text-xs leading-5 text-muted">Email changes require re-verification and will be handled separately.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="visitorPhone" className="text-sm font-medium text-foreground">Phone number</label>
                <div className="grid min-w-0 grid-cols-[minmax(6.5rem,7.75rem)_minmax(0,1fr)] gap-2">
                  <select
                    value={callingCode}
                    onChange={(event) => setCallingCode(event.target.value)}
                    className="h-12 rounded-xl border border-border bg-elevated px-3 text-sm text-foreground shadow-sm focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-ring/10"
                    aria-label="Country calling code"
                  >
                    {callingCodeOptions.map((option) => (
                      <option key={`${option.iso}-${option.code}`} value={option.code}>{option.iso} {option.code}</option>
                    ))}
                  </select>
                  <Input
                    id="visitorPhone"
                    value={phoneLocal}
                    inputMode="tel"
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="799010210"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="visitorCompany" className="text-sm font-medium text-foreground">Company (optional)</label>
                <Input
                  id="visitorCompany"
                  value={form.company}
                  onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
                  placeholder="Maalim Group Limited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="visitorIndustry" className="text-sm font-medium text-foreground">Industry (optional)</label>
              <Input
                id="visitorIndustry"
                list="visitor-industry-options"
                value={form.industry}
                onChange={(e) => setForm((current) => ({ ...current, industry: e.target.value }))}
                placeholder="Select or type your industry"
              />
              <datalist id="visitor-industry-options">
                {INDUSTRY_OPTIONS.map((industry) => (
                  <option key={industry} value={industry} />
                ))}
              </datalist>
              <p className="text-xs leading-5 text-muted">Choose from the list or type your own industry.</p>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save profile"}</Button>
            </div>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}

function splitPhone(phone: string) {
  const compact = phone.replace(/\s+/g, "")
  const match = callingCodeOptions
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((option) => compact.startsWith(option.code))
  if (!match) return { code: "+254", local: compact.replace(/^\+/, "") }
  return { code: match.code, local: compact.slice(match.code.length) }
}
