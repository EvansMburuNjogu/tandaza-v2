"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"

type TabType = "profile" | "security" | "notifications"

export default function OrganizerSettingsPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [activeTab, setActiveTab] = useState<TabType>("profile")
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    phone: "",
    address: "",
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  })

  const profileQuery = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: () => api.getOrganizerProfile(token || ""),
    enabled: Boolean(token)
  })

  useEffect(() => {
    if (!profileQuery.data) return
    setForm({
      name: profileQuery.data.name,
      companyName: profileQuery.data.companyName,
      phone: profileQuery.data.phone || "",
      address: profileQuery.data.address || "",
      emailNotifications: profileQuery.data.emailNotifications,
      smsNotifications: profileQuery.data.smsNotifications,
      pushNotifications: profileQuery.data.pushNotifications
    })
  }, [profileQuery.data])

  const profileMutation = useMutation({
    mutationFn: () => api.updateOrganizerProfile(token || "", form),
    onSuccess: async () => {
      toast.success("Settings updated")
      await profileQuery.refetch()
    },
    onError: (error) => toast.error("Could not save settings", { description: error instanceof Error ? error.message : "Try again." })
  })

  const tabs = [
    { id: "profile" as TabType, label: "Profile" },
    { id: "security" as TabType, label: "Security" },
    { id: "notifications" as TabType, label: "Notifications" }
  ]

  const handleSave = () => {
    if (!form.name.trim() || !form.companyName.trim()) {
      toast.error("Check profile details", { description: "Full name and company name are required." })
      return
    }
    profileMutation.mutate()
  }

  if (profileQuery.isError) return <ErrorState onRetry={() => profileQuery.refetch()} />
  if (profileQuery.isLoading || !profileQuery.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile and account settings."
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/80 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-slate-500 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Profile Information</h3>
            <p className="text-sm text-slate-500">Your personal and company details</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl"></div>
              <div>
                <p className="font-medium">{profileQuery.data.name}</p>
                <p className="text-sm text-slate-500">{profileQuery.data.email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Full Name</label>
                <Input 
                  value={form.name}
                  onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Email Address</label>
                <Input 
                  value={profileQuery.data.email}
                  placeholder="your@email.com"
                  disabled
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Company Name</label>
                <Input 
                  value={form.companyName}
                  onChange={(e) => setForm((value) => ({ ...value, companyName: e.target.value }))}
                  placeholder="Your company"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Phone Number</label>
                <Input 
                  value={form.phone}
                  onChange={(e) => setForm((value) => ({ ...value, phone: e.target.value }))}
                  placeholder="+254 700 000 000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Address</label>
              <Input 
                value={form.address}
                onChange={(e) => setForm((value) => ({ ...value, address: e.target.value }))}
                placeholder="Nairobi, Kenya"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} disabled={profileMutation.isPending}>{profileMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "security" && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
            <p className="text-sm text-slate-500">Manage your account security</p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={() => router.push("/change-password")}>Change Password</Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
            <p className="text-sm text-slate-500">Manage how you receive updates</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-elevated/60">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-slate-500">Receive updates about your expos via email</p>
              </div>
              <button 
                onClick={() => setForm(n => ({ ...n, emailNotifications: !n.emailNotifications }))}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  form.emailNotifications ? "bg-primary" : "bg-slate-300"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  form.emailNotifications ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-elevated/60">
              <div>
                <p className="text-sm font-medium text-foreground">SMS Notifications</p>
                <p className="text-xs text-slate-500">Receive urgent updates via SMS</p>
              </div>
              <button 
                onClick={() => setForm(n => ({ ...n, smsNotifications: !n.smsNotifications }))}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  form.smsNotifications ? "bg-primary" : "bg-slate-300"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  form.smsNotifications ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-elevated/60">
              <div>
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-slate-500">Receive in-app notifications</p>
              </div>
              <button 
                onClick={() => setForm(n => ({ ...n, pushNotifications: !n.pushNotifications }))}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  form.pushNotifications ? "bg-primary" : "bg-slate-300"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  form.pushNotifications ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-border">
            <Button onClick={handleSave} disabled={profileMutation.isPending}>{profileMutation.isPending ? "Saving..." : "Save Preferences"}</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
