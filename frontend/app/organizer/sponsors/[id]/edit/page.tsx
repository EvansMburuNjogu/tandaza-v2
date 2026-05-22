"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"

export default function EditSponsorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-sponsor", params.id],
    queryFn: () => api.getOrganizerSponsor(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    commissionRate: "",
    status: "pending" as "active" | "pending" | "expired" | "cancelled"
  })

  useEffect(() => {
    if (!data) return
    setForm({
      company: data.company,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone || "",
      commissionRate: String(data.commissionRate || 0),
      status: data.status
    })
  }, [data])

  if (isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (error || !data) return <ErrorState title="Sponsor not found" />

  const handleSave = async () => {
    if (!form.company.trim() || !form.contactName.trim() || !form.email.includes("@")) {
      toast.error("Check sponsor details", { description: "Company, contact person, and a valid email are required." })
      return
    }
    const commissionRate = Number(form.commissionRate)
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      toast.error("Check commission", { description: "Commission must be between 0 and 100 percent." })
      return
    }
    setSaving(true)
    try {
      await api.updateOrganizerSponsor(token || "", params.id, { ...form, commissionRate })
      toast.success("Sponsor updated")
      router.push(`/organizer/sponsors/${params.id}`)
    } catch (error) {
      toast.error("Could not update sponsor", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Sponsor"
        description="Update sponsor details and commission"
        actions={<BackLink href={`/organizer/sponsors/${params.id}`} label="Back" />}
      />

      <Card className="max-w-2xl p-6">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Company Name</label>
              <Input
                value={form.company}
                onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Contact Person</label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="Jane Wanjiku"
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
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Phone</label>
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
              <Input value={form.commissionRate} onChange={(e) => setForm(f => ({ ...f, commissionRate: e.target.value }))} type="number" min="0" max="100" step="0.01" placeholder="10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button variant="secondary" onClick={() => router.push(`/organizer/sponsors/${params.id}`)}>Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
