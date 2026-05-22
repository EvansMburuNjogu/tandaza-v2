"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"

type TabType = "profile" | "notifications" | "security"

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

  useState(() => {
    if (settings) {
      setForm({
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        company: settings.company || ""
      })
      setNotifications({
        email: settings.notifications.email,
        push: settings.notifications.push,
        expoUpdates: settings.notifications.expoUpdates ?? true,
        reminders: settings.notifications.reminders
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateVisitorSettings(token || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-settings"] })
      toast.success("Settings updated successfully!")
    }
  })

  const handleSave = () => {
    updateMutation.mutate({ ...form, notifications })
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
    { id: "notifications", label: "Notifications" },
    { id: "security", label: "Security" }
  ]

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted">Manage your profile and account settings.</p>
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
              <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      type="email"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Company (Optional)</label>
                    <Input
                      value={form.company}
                      onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
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
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
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
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
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
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
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
                <Button onClick={handleSave}>Save Preferences</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "security" && (
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-primary/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Current Password</label>
                  <Input type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <Input type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm Password</label>
                  <Input type="password" placeholder="Confirm new password" />
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleSave}>Update Password</Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </SessionGuard>
  )
}
