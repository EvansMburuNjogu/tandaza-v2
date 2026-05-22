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
import { getOrganizerByID } from "@/lib/admin-entities"
import { api } from "@/lib/api"
import { validateAdminAccountInput } from "@/lib/admin-validation"

export default function EditOrganizerPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["organizer", params.id], queryFn: () => getOrganizerByID(token || "", params.id), enabled: Boolean(token && params.id) })
  const [values, setValues] = useState({ name: "", company: "", email: "", status: "pending", expos: "0" })

  useEffect(() => {
    if (!query.data) return
    setValues({ name: query.data.name, company: query.data.company, email: query.data.email, status: query.data.status, expos: String(query.data.expos) })
  }, [query.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateAdminAccountInput({ name: values.name, email: values.email, company: values.company })) return
    try {
      await api.updateAdminUser(token || "", params.id, { name: values.name, email: values.email, role: "organizer", companyName: values.company, status: values.status === "suspended" ? "suspended" : "active" })
      toast.success("Organizer updated")
      router.push(`/administrator/organizers/${params.id}`)
    } catch (error) {
      toast.error("Could not update organizer", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Organizer not found" message="This organizer record does not exist in the current dataset." />

  return (
    <AdminFormPage title="Edit Organizer" description="Update organizer details, account state, and core business information." backHref={`/administrator/organizers/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Organizer Name</label><Input required minLength={2} maxLength={120} placeholder="Evans Mburu" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Company</label><Input required minLength={2} maxLength={140} placeholder="Tandaza Events" value={values.company} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="organizer@company.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Status</label><select value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="pending">pending</option><option value="verified">verified</option><option value="suspended">suspended</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Expos Managed</label><Input type="number" min="0" step="1" placeholder="0" value={values.expos} onChange={(e) => setValues((v) => ({ ...v, expos: e.target.value }))} /></div>
      </div>
    </AdminFormPage>
  )
}
