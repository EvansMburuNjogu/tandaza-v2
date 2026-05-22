"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminFormPage } from "@/components/admin/admin-form-page"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { validateAdminAccountInput } from "@/lib/admin-validation"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"

export default function NewOrganizerPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const [values, setValues] = useState({ name: "", company: "", email: "", password: "" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateAdminAccountInput({ ...values, company: values.company })) return
    try {
      await api.createAdminOrganizer(token || "", { name: values.name, email: values.email, password: values.password, role: "organizer", companyName: values.company, countryCode: selectedCountry === "ALL" ? "KE" : selectedCountry, status: "active" })
      toast.success("Organizer account created", { description: "Login credentials, welcome email, and founder note have been sent." })
      router.push("/administrator/organizers")
    } catch (error) {
      toast.error("Could not create organizer", { description: error instanceof Error ? error.message : "Check the details and try again." })
    }
  }

  return (
    <AdminFormPage
      title="New Organizer"
      description="Create a new organizer record and prepare it for expo assignments."
      backHref="/administrator/organizers"
      submitLabel="Create Organizer"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Organizer Name</label><Input required minLength={2} maxLength={120} placeholder="Evans Mburu" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Company</label><Input required minLength={2} maxLength={140} placeholder="Tandaza Events" value={values.company} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="organizer@company.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Temporary Password</label><Input required type="password" minLength={8} maxLength={128} placeholder="At least 8 characters" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} /></div>
      </div>
    </AdminFormPage>
  )
}
