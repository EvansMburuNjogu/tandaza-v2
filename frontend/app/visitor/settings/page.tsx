"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { callingCodeOptions } from "@/lib/calling-codes"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"

type TabType = "profile" | "notifications"

export default function VisitorSettingsPage() {
  const token = useSessionStore((s) => s.token)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>("profile")
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: ""
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
    if (settings) {
      const phoneParts = splitPhone(settings.phone || "")
      setForm({
        name: settings.name,
        email: settings.email,
        phone: settings.phone || "",
        company: settings.company || ""
      })
      setCallingCode(phoneParts.code)
      setPhoneLocal(phoneParts.local)
      setNotifications({
        email: settings.notifications.email,
        push: settings.notifications.push,
        expoUpdates: settings.notifications.expoUpdates ?? true,
        reminders: settings.notifications.reminders
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; company: string; notifications: typeof notifications }) => api.updateVisitorSettings(token || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-settings"] })
      toast.success("Settings updated", { description: "Your visitor profile has been saved." })
    },
    onError: (error) => {
      toast.error("Could not save settings", { description: error instanceof Error ? error.message : "Please check your details and try again." })
    }
  })

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) {
      toast.error("Could not save settings", { description: "Enter your full name." })
      return
    }
    const localPhone = phoneLocal.replace(/[^\d]/g, "")
    const phone = localPhone ? `${callingCode}${localPhone}` : ""
    updateMutation.mutate({ name, company: form.company.trim(), phone, notifications })
  }

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-muted">Loading settings...</p>
      </div>
    )
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "notifications", label: "Notifications" }
  ]

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[1.75rem]">Visitor Settings</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted">Keep your contact details ready for meeting reminders and exhibitor follow-up.</p>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border/80 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary bg-primary/5 text-primary"
                   : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-1">Profile Information</h3>
              <p className="mb-5 text-sm leading-6 text-muted">This information is used when you request meetings, share interest, or submit pre-order intent.</p>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="visitorName" className="text-sm font-medium text-foreground">Full Name <span className="text-primary" aria-hidden>*</span></label>
                    <Input
                      id="visitorName"
                      required
                      aria-required="true"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
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
                    <div className="grid grid-cols-[7.75rem_minmax(0,1fr)] gap-2">
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
                      onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="Maalim Group Limited"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Profile"}</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-1">Notification Preferences</h3>
              <p className="mb-5 text-sm leading-6 text-muted">Choose how Tandaza should reach you for meetings, expo updates, and exhibitor responses.</p>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted">Receive updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications(n => ({ ...n, email: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted">Receive push notifications on your device</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) => setNotifications(n => ({ ...n, push: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Expo Updates</p>
                    <p className="text-sm text-muted">Get notified about expo changes and exhibitor activity</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.expoUpdates}
                    onChange={(e) => setNotifications(n => ({ ...n, expoUpdates: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Expo Reminders</p>
                    <p className="text-sm text-muted">Receive reminders before saved expo activities</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.reminders}
                    onChange={(e) => setNotifications(n => ({ ...n, reminders: e.target.checked }))}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>
              <div className="flex justify-end pt-4 border-t border-border mt-6">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Preferences"}</Button>
              </div>
            </div>
          </Card>
        )}
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
