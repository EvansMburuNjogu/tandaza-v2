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

export default function EditTeamMemberPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["organizer-team-member", params.id],
    queryFn: () => api.getOrganizerTeamMember(token || "", params.id),
    enabled: Boolean(token && params.id)
  })

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "staff" as "staff" | "assistant" | "manager",
    status: "active" as "active" | "inactive"
  })

  useEffect(() => {
    if (!data) return
    setForm({
      name: data.name,
      email: data.email,
      role: data.role === "owner" ? "manager" : data.role,
      status: data.status
    })
  }, [data])

  if (isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (error || !data) return <ErrorState title="Team member not found" />

  const handleSave = async () => {
    if (data.role === "owner") {
      toast.error("Owner account is managed from Settings")
      return
    }
    if (!form.name.trim() || !form.email.includes("@")) {
      toast.error("Check team member details", { description: "Name and a valid email address are required." })
      return
    }
    setSaving(true)
    try {
      await api.updateOrganizerTeamMember(token || "", params.id, form)
      toast.success("Team member updated")
      router.push(`/organizer/team/${params.id}`)
    } catch (error) {
      toast.error("Could not update team member", { description: error instanceof Error ? error.message : "Try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Team Member"
        description="Update team member details and permissions"
        actions={<BackLink href={`/organizer/team/${params.id}`} label="Back" />}
      />

      <Card className="max-w-2xl p-6">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Operations lead"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                type="email"
                placeholder="ops@company.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value as any }))}
                className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="assistant">Assistant</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving || data.role === "owner"}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button variant="secondary" onClick={() => router.push(`/organizer/team/${params.id}`)}>Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
