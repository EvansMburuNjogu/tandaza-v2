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

export default function InviteSponsorPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    commissionRate: "",
    temporaryPassword: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company.trim() || !form.contactName.trim() || !form.email.includes("@")) {
      toast.error("Check sponsor details", { description: "Company, contact person, and a valid email are required." })
      return
    }
    const commissionRate = Number(form.commissionRate)
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      toast.error("Check commission", { description: "Commission must be between 0 and 100 percent." })
      return
    }
    if (form.temporaryPassword.trim().length < 8) {
      toast.error("Temporary password is too short", { description: "Use at least 8 characters." })
      return
    }
    setSaving(true)
    try {
      await api.createOrganizerSponsor(token || "", { ...form, commissionRate, temporaryPassword: form.temporaryPassword.trim(), status: "pending" })
      toast.success("Sponsor invitation saved")
      router.push("/organizer/sponsors")
    } catch (error) {
      toast.error("Could not invite sponsor", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite Sponsor"
        description="Invite a new sponsor to partner with your expos"
        actions={<BackLink href="/organizer/sponsors" label="Back to Sponsors" />}
      />

      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Company Name</label>
              <Input
                value={form.company}
                onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corporation"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Contact Person</label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Phone Number</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+254 700 000 000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Commission %</label>
              <Input value={form.commissionRate} onChange={(e) => setForm(f => ({ ...f, commissionRate: e.target.value }))} placeholder="10" type="number" min="0" max="100" step="0.01" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Temporary Password</label>
              <Input value={form.temporaryPassword} onChange={(e) => setForm(f => ({ ...f, temporaryPassword: e.target.value }))} placeholder="Create a temporary password" type="text" minLength={8} required />
              <p className="text-xs text-slate-500">Sponsor will create a new password on first login.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" disabled={saving}>{saving ? "Sending..." : "Send Invitation"}</Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/organizer/sponsors")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
