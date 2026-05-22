"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Role } from "@/lib/api/contracts"
import { validateAdminAccountInput } from "@/lib/admin-validation"
import { useSessionStore } from "@/store/session-store"

export default function NewSystemUserPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const [values, setValues] = useState({ name: "", email: "", password: "", role: "super_administrator" as Role, status: "active" as "active" | "inactive" | "suspended" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateAdminAccountInput(values)) return
    try {
      await api.createAdminUser(token || "", { ...values, companyName: "Tandaza", countryCode: "KE" })
      toast.success("System user created", { description: "A welcome email with the temporary password has been queued." })
      router.push("/administrator/users")
    } catch (error) {
      toast.error("Could not create user", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  return (
    <AdminFormPage title="New System User" description="Add a new internal Tandaza operator account with controlled access." backHref="/administrator/users" submitLabel="Create System User" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Full Name</label><Input required minLength={2} maxLength={120} placeholder="Jane Admin" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="admin@tandaza.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Temporary Password</label><Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="At least 8 characters" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Role</label><select value={values.role} onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as Role }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="super_administrator">Super administrator</option><option value="administrator">Administrator</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Status</label><select value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as typeof values.status }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="active">active</option><option value="inactive">inactive</option><option value="suspended">suspended</option></select></div>
      </div>
    </AdminFormPage>
  )
}
