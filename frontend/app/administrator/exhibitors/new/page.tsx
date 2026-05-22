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

export default function NewExhibitorPage() {
  const router = useRouter()
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({ company: "", contact: "", email: "", password: "" })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!validateAdminAccountInput({ name: values.contact, email: values.email, company: values.company, password: values.password })) return
    setSaving(true)
    try {
      await api.createAdminExhibitor(token || "", { name: values.contact, email: values.email, password: values.password, role: "exhibitor", companyName: values.company, countryCode: selectedCountry === "ALL" ? "KE" : selectedCountry, status: "active" })
      toast.success("Exhibitor account created", { description: "Login credentials, welcome email, and founder note have been sent." })
      router.push("/administrator/exhibitors")
    } catch (error) {
      toast.error("Could not create exhibitor", { description: error instanceof Error ? error.message : "Check the details and try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminFormPage title="New Exhibitor" description="Create a new exhibitor account. Expo assignment and activation payment happen from the exhibitor profile or expo detail page." backHref="/administrator/exhibitors" submitLabel="Create Exhibitor" submitting={saving} onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Company</label><Input required minLength={2} maxLength={140} placeholder="TechCorp Africa" value={values.company} onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Primary Contact</label><Input required minLength={2} maxLength={120} placeholder="Grace Wanjiku" value={values.contact} onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Email</label><Input required type="email" maxLength={160} placeholder="exhibitor@company.com" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium text-slate-600">Temporary Password</label><Input required type="password" minLength={8} maxLength={128} placeholder="At least 8 characters" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} /></div>
      </div>
    </AdminFormPage>
  )
}
