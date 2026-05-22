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
import { useAdminCountryStore } from "@/store/admin-country-store"
import { getExhibitorByID } from "@/lib/admin-entities"
import { api } from "@/lib/api"
import { validateAdminAccountInput } from "@/lib/admin-validation"

export default function EditExhibitorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const query = useQuery({ queryKey: ["exhibitor", params.id], queryFn: () => getExhibitorByID(token || "", params.id), enabled: Boolean(token && params.id) })
  const expos = useQuery({ queryKey: ["admin-expos", selectedCountry], queryFn: () => api.getAdminExpos(token || "", selectedCountry), enabled: Boolean(token) })
  const [values, setValues] = useState({ company: "", contact: "", email: "", expoId: "", assignmentStatus: "invited", status: "active" })

  useEffect(() => {
    if (!query.data) return
    const selectedExpo = expos.data?.items.find((expo) => expo.name === query.data?.assignedExpos)
    setValues({
      company: query.data.company,
      contact: query.data.contact,
      email: query.data.email,
      expoId: selectedExpo?.id || "",
      assignmentStatus: ["invited", "pending_activation", "active", "disabled"].includes(query.data.status) ? query.data.status : "invited",
      status: query.data.status === "suspended" || query.data.status === "disabled" ? "suspended" : "active"
    })
  }, [expos.data?.items, query.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateAdminAccountInput({ name: values.contact, email: values.email, company: values.company })) return
    try {
      await api.updateAdminExhibitor(token || "", params.id, { name: values.contact, email: values.email, role: "exhibitor", companyName: values.company, status: values.status === "suspended" ? "suspended" : "active" })
      if (values.expoId) {
        await api.assignAdminExhibitor(token || "", {
          expoId: values.expoId,
          exhibitorId: params.id,
          status: values.assignmentStatus as "invited" | "pending_activation" | "active" | "disabled"
        })
      }
      toast.success("Exhibitor updated")
      router.push(`/administrator/exhibitors/${params.id}`)
    } catch (error) {
      toast.error("Could not update exhibitor", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Exhibitor not found" message="This exhibitor record does not exist in the current dataset." />

  return (
    <AdminFormPage title="Edit Exhibitor" description="Update exhibitor details, assignments, and status settings." backHref={`/administrator/exhibitors/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Company</label><Input required minLength={2} maxLength={140} placeholder="TechCorp Africa" value={values.company} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Primary Contact</label><Input required minLength={2} maxLength={120} placeholder="Grace Wanjiku" value={values.contact} onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="exhibitor@company.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">Assigned Expo</label>
          <select value={values.expoId} onChange={(e) => setValues((v) => ({ ...v, expoId: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none">
            <option value="">{expos.isLoading ? "Loading expos..." : "Select expo"}</option>
            {(expos.data?.items || []).map((expo) => <option key={expo.id} value={expo.id}>{expo.name}</option>)}
          </select>
        </div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Assignment Status</label><select value={values.assignmentStatus} onChange={(e) => setValues((v) => ({ ...v, assignmentStatus: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="invited">invited</option><option value="pending_activation">pending activation</option><option value="active">active</option><option value="disabled">disabled</option></select></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Status</label><select value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none"><option value="pending">pending</option><option value="active">active</option><option value="suspended">suspended</option></select></div>
      </div>
    </AdminFormPage>
  )
}
