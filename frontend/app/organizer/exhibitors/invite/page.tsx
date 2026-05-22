"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackLink } from "@/components/ui/back-link"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"

export default function InviteOrganizerExhibitorPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", temporaryPassword: "" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.companyName.trim() || !form.contactName.trim() || !form.email.includes("@")) {
      toast.error("Check exhibitor details", { description: "Company, contact name, and a valid email are required." })
      return
    }
    if (form.temporaryPassword.trim().length < 8) {
      toast.error("Temporary password is too short", { description: "Use at least 8 characters." })
      return
    }
    setSaving(true)
    try {
      await api.inviteOrganizerExhibitor(token || "", { ...form, temporaryPassword: form.temporaryPassword.trim() })
      toast.success("Exhibitor invited")
      router.push("/organizer/exhibitors")
    } catch (error) {
      toast.error("Could not invite exhibitor", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Invite Exhibitor" description="Create exhibitor access. Expo assignment and activation are managed from expo workspaces." actions={<BackLink href="/organizer/exhibitors" label="Back to Exhibitors" />} />
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name"><Input required placeholder="TechCorp Africa" value={form.companyName} onChange={(e) => setForm((v) => ({ ...v, companyName: e.target.value }))} /></Field>
            <Field label="Contact Name"><Input required placeholder="Amina Otieno" value={form.contactName} onChange={(e) => setForm((v) => ({ ...v, contactName: e.target.value }))} /></Field>
            <Field label="Email Address"><Input required type="email" placeholder="amina@company.com" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} /></Field>
            <Field label="Phone Number"><Input placeholder="+254 700 000 000" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} /></Field>
            <Field label="Temporary Password"><Input required type="text" minLength={8} placeholder="Create a temporary password" value={form.temporaryPassword} onChange={(e) => setForm((v) => ({ ...v, temporaryPassword: e.target.value }))} /></Field>
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={saving}>{saving ? "Inviting..." : "Invite Exhibitor"}</Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/organizer/exhibitors")}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-600">{label}</label>{children}</div>
}
