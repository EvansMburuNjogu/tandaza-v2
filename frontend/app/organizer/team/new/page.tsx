"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackLink } from "@/components/ui/back-link"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

export default function NewTeamMemberPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    temporaryPassword: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.includes("@")) {
      toast.error("Check team member details", { description: "Name and a valid email address are required." })
      return
    }
    if (form.temporaryPassword.trim().length < 8) {
      toast.error("Temporary password is too short", { description: "Use at least 8 characters." })
      return
    }
    setSaving(true)
    try {
      await api.createOrganizerTeamMember(token || "", { ...form, role: "staff", status: "active" })
      toast.success("Team member added")
      router.push("/organizer/team")
    } catch (error) {
      toast.error("Could not add team member", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Team Member"
        description="Invite a new team member to your organization"
        actions={<BackLink href="/organizer/team" label="Back to Team" />}
      />

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Full Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Email Address</label>
              <Input
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="john@company.com"
                type="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Temporary Password</label>
            <Input value={form.temporaryPassword} onChange={(e) => setForm(f => ({ ...f, temporaryPassword: e.target.value }))} placeholder="Create a temporary password" type="text" minLength={8} required />
            <p className="text-xs text-slate-500">They will be asked to create a new password the first time they log in.</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Team Member"}</Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/organizer/team")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
