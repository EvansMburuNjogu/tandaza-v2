"use client"

import { useState } from "react"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type TabType = "profile" | "security" | "notifications"

export default function SponsorSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profile")
  const [form, setForm] = useState({
    companyName: "BrandLift Media",
    contactName: "Mike Kariuki",
    email: "mike@brandlift.media",
    phone: "+254 700 000 000",
    website: "https://brandlift.media"
  })

  const tabs: { id: TabType; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "notifications", label: "Notifications" }
  ]

  const handleSave = () => {
    toast.success("Settings updated successfully!")
  }

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Manage your sponsor profile and account settings."
        />

        <div className="flex gap-1 overflow-x-auto border-b border-border/80 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary bg-primary/5 text-primary"
                  : "text-slate-500 hover:text-foreground"
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
              <h3 className="text-lg font-semibold mb-4">Company Profile</h3>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Company Name</label>
                    <Input
                      value={form.companyName}
                      onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Contact Name</label>
                    <Input
                      value={form.contactName}
                      onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      type="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Phone</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Website</label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "security" && (
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Current Password</label>
                  <Input type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">New Password</label>
                  <Input type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Confirm Password</label>
                  <Input type="password" placeholder="Confirm new password" />
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button onClick={handleSave}>Update Password</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-primary/5 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-slate-500">Receive updates via email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                </label>
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Campaign Alerts</p>
                    <p className="text-sm text-slate-500">Get notified about campaign performance</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                </label>
                <label className="flex items-center justify-between p-3 bg-elevated rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium">Payment Confirmations</p>
                    <p className="text-sm text-slate-500">Receive payment receipts</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                </label>
              </div>
              <div className="flex justify-end pt-4 border-t border-border mt-6">
                <Button onClick={handleSave}>Save Preferences</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </SessionGuard>
  )
}