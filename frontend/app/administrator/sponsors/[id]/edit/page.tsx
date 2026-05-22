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
import { getSponsorByID } from "@/lib/admin-entities"
import { api } from "@/lib/api"
import { validateAdminAccountInput } from "@/lib/admin-validation"

export default function EditSponsorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["sponsor", params.id], queryFn: () => getSponsorByID(token || "", params.id), enabled: Boolean(token && params.id) })
  const [values, setValues] = useState({ sponsor: "", company: "", email: "" })

  useEffect(() => {
    if (!query.data) return
    setValues({ sponsor: query.data.sponsor, company: query.data.company, email: query.data.email })
  }, [query.data])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateAdminAccountInput({ name: values.sponsor, email: values.email, company: values.company })) return
    try {
      await api.updateAdminSponsor(token || "", params.id, { name: values.sponsor, email: values.email, role: "sponsorship", companyName: values.company })
      toast.success("Sponsor updated")
      router.push(`/administrator/sponsors/${params.id}`)
    } catch (error) {
      toast.error("Could not update sponsor", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Sponsor not found" message="This sponsor record does not exist in the current dataset." />

  return (
    <AdminFormPage title="Edit Sponsor" description="Update sponsor contact and company details." backHref={`/administrator/sponsors/${params.id}`} submitLabel="Save Changes" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Sponsor Name</label><Input required minLength={2} maxLength={120} placeholder="Amina Otieno" value={values.sponsor} onChange={(e) => setValues((v) => ({ ...v, sponsor: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Company</label><Input required minLength={2} maxLength={140} placeholder="BrandLift Media" value={values.company} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="sponsor@company.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
      </div>
    </AdminFormPage>
  )
}
