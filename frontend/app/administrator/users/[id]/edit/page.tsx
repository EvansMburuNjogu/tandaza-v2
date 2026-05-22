"use client"

import { FormEvent, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { useSessionStore } from "@/store/session-store"
import { getSystemUserByID } from "@/lib/admin-entities"
import { api } from "@/lib/api"
import { validateAdminAccountInput } from "@/lib/admin-validation"
import { Role } from "@/lib/api/contracts"

export default function EditSystemUserPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["system-user", params.id], queryFn: () => getSystemUserByID(token || "", params.id), enabled: Boolean(token && params.id) })
  const [values, setValues] = useState({ name: "", email: "", role: "super_administrator", status: "active" })

  useEffect(() => {
    if (!query.data) return
    setValues({ name: query.data.name, email: query.data.email, role: query.data.role, status: query.data.status })
  }, [query.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateAdminAccountInput(values)) return
    try {
      await api.updateAdminUser(token || "", params.id, { name: values.name, email: values.email, role: values.role as Role, status: values.status as "active" | "inactive" | "suspended" })
      toast.success("System user updated")
      router.push(`/administrator/users/${params.id}`)
    } catch (error) {
      toast.error("Could not update user", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="System user not found" message="This internal account does not exist in the current dataset." />

  return (
    <AdminFormPage title="Edit System User" description="Update internal user details, role, and account state." backHref={`/administrator/users/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Full Name</label><Input required minLength={2} maxLength={120} placeholder="Jane Admin" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="admin@tandaza.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Role</label><select value={values.role} onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="super_administrator">Super administrator</option><option value="administrator">Administrator</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Status</label><select value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="active">active</option><option value="inactive">inactive</option><option value="suspended">suspended</option></select></div>
      </div>
    </AdminFormPage>
  )
}
