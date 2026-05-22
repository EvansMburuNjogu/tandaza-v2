"use client"

import { FormEvent, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { ImageUploadField } from "@/components/media/image-upload-field"
import { DataTable } from "@/components/admin/data-table"
import { StatusBadge } from "@/components/admin/status-badge"
import { api } from "@/lib/api"
import { CompanyDocument, ExhibitorTeamMember } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"
import { cn, formatDate, mediaUrl } from "@/lib/utils"

type TabType = "profile" | "documents" | "social" | "meetingCategories" | "team"

const DEFAULT_MEETING_CATEGORIES = ["Online demo", "Sales consultation", "Product walkthrough", "Partnership discussion", "Post-expo follow-up"]

export default function ExhibitorSettingsPage() {
  const token = useSessionStore((s) => s.token)
  const currentUser = useSessionStore((s) => s.user)
  const client = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>("profile")
  const [logoFailed, setLogoFailed] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<ExhibitorTeamMember | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<ExhibitorTeamMember | null>(null)
  
  const profileQuery = useQuery({
    queryKey: ["exhibitor-profile"],
    queryFn: () => api.getExhibitorProfile(token || ""),
    enabled: Boolean(token)
  })
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(token || ""),
    enabled: Boolean(token)
  })
  const teamQuery = useQuery({
    queryKey: ["exhibitor-team"],
    queryFn: () => api.getExhibitorTeam(token || ""),
    enabled: Boolean(token)
  })
  const documentsQuery = useQuery({
    queryKey: ["exhibitor-documents"],
    queryFn: () => api.getExhibitorDocuments(token || ""),
    enabled: Boolean(token)
  })
  const meetingCategoriesQuery = useQuery({
    queryKey: ["exhibitor-meeting-categories", token],
    queryFn: () => api.getExhibitorMeetingCategories(token || ""),
    enabled: Boolean(token)
  })

  const [form, setForm] = useState({
    companyName: "",
    description: "",
    phone: "",
    address: "",
    logoUrl: "",
    categories: [] as string[],
    linkedin: "",
    twitter: "",
    instagram: ""
  })
  const [teamForm, setTeamForm] = useState({
    name: "",
    email: "",
    temporaryPassword: ""
  })
  const [teamEditForm, setTeamEditForm] = useState({
    name: "",
    email: "",
    status: "active" as "active" | "inactive"
  })
  const [documentForm, setDocumentForm] = useState({
    name: "",
    file: null as File | null
  })
  const [meetingCategoryInput, setMeetingCategoryInput] = useState("")
  const [meetingCategories, setMeetingCategories] = useState<string[]>(DEFAULT_MEETING_CATEGORIES)

  useEffect(() => {
    const profile = profileQuery.data
    if (!profile) return
    setForm({
      companyName: profile.companyName,
      description: profile.description,
      phone: profile.phone,
      address: profile.address,
      logoUrl: profile.logoUrl || "",
      categories: profile.categories || [],
      linkedin: profile.socialLinks.linkedin || "",
      twitter: profile.socialLinks.twitter || "",
      instagram: profile.socialLinks.instagram || ""
    })
  }, [profileQuery.data])

  useEffect(() => {
    const categories = meetingCategoriesQuery.data?.categoryTypes
    setMeetingCategories(categories?.length ? categories : DEFAULT_MEETING_CATEGORIES)
  }, [meetingCategoriesQuery.data])

  const mutation = useMutation({
    mutationFn: () => api.updateExhibitorProfile(token || "", {
      companyName: form.companyName,
      description: form.description,
      website: "",
      phone: form.phone,
      address: form.address,
      logoUrl: form.logoUrl,
      categories: form.categories,
      socialLinks: { linkedin: form.linkedin, twitter: form.twitter, instagram: form.instagram }
    }),
    onSuccess: () => {
      toast.success("Profile updated.")
      client.invalidateQueries({ queryKey: ["exhibitor-profile"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update profile")
  })
  const teamMutation = useMutation({
    mutationFn: () => api.createExhibitorTeamMember(token || "", {
      name: teamForm.name.trim(),
      email: teamForm.email.trim(),
      temporaryPassword: teamForm.temporaryPassword.trim(),
      role: "staff",
      status: "active"
    }),
    onSuccess: () => {
      toast.success("Team member added.")
      setTeamForm({ name: "", email: "", temporaryPassword: "" })
      setTeamDialogOpen(false)
      client.invalidateQueries({ queryKey: ["exhibitor-team"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add team member")
  })
  const teamUpdateMutation = useMutation({
    mutationFn: () => {
      if (!editingMember) throw new Error("Select a team member first.")
      return api.updateExhibitorTeamMember(token || "", editingMember.id, {
        name: teamEditForm.name.trim(),
        email: teamEditForm.email.trim(),
        role: "staff",
        status: teamEditForm.status,
        temporaryPassword: "unchanged"
      })
    },
    onSuccess: () => {
      toast.success("Team member updated.")
      setEditingMember(null)
      client.invalidateQueries({ queryKey: ["exhibitor-team"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update team member")
  })
  const teamDeleteMutation = useMutation({
    mutationFn: (member: ExhibitorTeamMember) => api.deleteExhibitorTeamMember(token || "", member.id),
    onSuccess: () => {
      toast.success("Team member removed.")
      setMemberToRemove(null)
      client.invalidateQueries({ queryKey: ["exhibitor-team"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove team member")
  })
  const documentMutation = useMutation({
    mutationFn: async () => {
      const file = documentForm.file
      const name = documentForm.name.trim()
      if (!file || !name) throw new Error("Document name and PDF file are required.")
      if (file.type !== "application/pdf") throw new Error("Upload a PDF document.")
      const media = await api.uploadMedia(token || "", file)
      return api.createExhibitorDocument(token || "", {
        name,
        url: media.url,
        mimeType: media.mimeType,
        size: media.size
      })
    },
    onSuccess: () => {
      toast.success("Company document uploaded.")
      setDocumentForm({ name: "", file: null })
      setDocumentDialogOpen(false)
      client.invalidateQueries({ queryKey: ["exhibitor-documents"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload company document")
  })
  const documentDeleteMutation = useMutation({
    mutationFn: (document: CompanyDocument) => api.deleteExhibitorDocument(token || "", document.id),
    onSuccess: () => {
      toast.success("Company document removed.")
      client.invalidateQueries({ queryKey: ["exhibitor-documents"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove company document")
  })
  const meetingCategoriesMutation = useMutation({
    mutationFn: (categories: string[]) => api.updateExhibitorMeetingCategories(token || "", { categoryTypes: categories }),
    onSuccess: (settings) => {
      setMeetingCategories(settings.categoryTypes?.length ? settings.categoryTypes : DEFAULT_MEETING_CATEGORIES)
      toast.success("Meeting categories updated.")
      client.invalidateQueries({ queryKey: ["exhibitor-meeting-categories"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save meeting categories")
  })

  const handleSave = () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required.")
      return
    }
    mutation.mutate()
  }

  const handleTeamSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!teamForm.name.trim()) {
      toast.error("Team member name is required.")
      return
    }
    if (!teamForm.email.includes("@")) {
      toast.error("Enter a valid team member email.")
      return
    }
    if (teamForm.temporaryPassword.trim().length < 8) {
      toast.error("Temporary password must be at least 8 characters.")
      return
    }
    teamMutation.mutate()
  }

  const openEditMember = (member: ExhibitorTeamMember) => {
    setEditingMember(member)
    setTeamEditForm({
      name: member.name,
      email: member.email,
      status: member.status === "inactive" ? "inactive" : "active"
    })
  }

  const canRemoveTeamMember = (member: ExhibitorTeamMember) => member.role !== "owner" && member.id !== currentUser?.id

  const handleTeamEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!teamEditForm.name.trim()) {
      toast.error("Team member name is required.")
      return
    }
    if (!teamEditForm.email.includes("@")) {
      toast.error("Enter a valid team member email.")
      return
    }
    if (editingMember?.id === currentUser?.id && teamEditForm.status === "inactive") {
      toast.error("You cannot deactivate your own access.")
      return
    }
    teamUpdateMutation.mutate()
  }

  const handleDocumentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!documentForm.name.trim()) {
      toast.error("Document name is required.")
      return
    }
    if (!documentForm.file) {
      toast.error("Choose a PDF document.")
      return
    }
    if (documentForm.file.type !== "application/pdf") {
      toast.error("Only PDF documents are allowed.")
      return
    }
    documentMutation.mutate()
  }

  const handleDocumentRemove = (document: CompanyDocument) => {
    if (documentDeleteMutation.isPending) return
    const confirmed = window.confirm(`Remove "${document.name}"?`)
    if (!confirmed) return
    documentDeleteMutation.mutate(document)
  }

  const handleAddMeetingCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = meetingCategoryInput.trim()
    if (value.length < 2) {
      toast.error("Meeting category must be at least 2 characters.")
      return
    }
    if (value.length > 80) {
      toast.error("Meeting category must be under 80 characters.")
      return
    }
    if (meetingCategories.some((category) => category.toLowerCase() === value.toLowerCase())) {
      toast.error("This meeting category already exists.")
      return
    }
    const nextCategories = cleanMeetingCategoryList([...meetingCategories, value])
    meetingCategoriesMutation.mutate(nextCategories, {
      onSuccess: () => setMeetingCategoryInput("")
    })
  }

  const handleRemoveMeetingCategory = (category: string) => {
    if (meetingCategories.length <= 1) {
      toast.error("Keep at least one meeting category.")
      return
    }
    const nextCategories = cleanMeetingCategoryList(meetingCategories.filter((item) => item !== category))
    meetingCategoriesMutation.mutate(nextCategories)
  }

  if (profileQuery.isError || categoriesQuery.isError || teamQuery.isError || documentsQuery.isError || meetingCategoriesQuery.isError) return <ErrorState onRetry={() => { profileQuery.refetch(); categoriesQuery.refetch(); teamQuery.refetch(); documentsQuery.refetch(); meetingCategoriesQuery.refetch() }} />
  if (profileQuery.isLoading || categoriesQuery.isLoading || teamQuery.isLoading || documentsQuery.isLoading || meetingCategoriesQuery.isLoading || !profileQuery.data || !categoriesQuery.data || !teamQuery.data || !documentsQuery.data || !meetingCategoriesQuery.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const profile = profileQuery.data
  const logoPreview = mediaUrl(form.logoUrl || profile.logo)
  const canShowLogo = Boolean(logoPreview) && !logoFailed
  const initials = form.companyName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EX"

  const tabs = [
    { id: "profile" as TabType, label: "Company Profile" },
    { id: "documents" as TabType, label: "Company Documents" },
    { id: "social" as TabType, label: "Social Media" },
    { id: "meetingCategories" as TabType, label: "Meeting Categories" },
    { id: "team" as TabType, label: "Team Members" }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your exhibitor profile and account settings."
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border/80 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-slate-500 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="relative">
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border/70 bg-elevated/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card text-lg font-bold text-primary shadow-card">
                  {canShowLogo ? (
                    <img src={logoPreview} alt={`${form.companyName || "Company"} logo`} className="h-full w-full object-contain p-2" onError={() => setLogoFailed(true)} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Company Settings</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Company Profile</h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">This logo appears on your exhibitor profile, expo workspace, product catalog, and visitor-facing pages.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <ImageUploadField token={token || ""} label="Company Logo" description="Upload a PNG, JPG, or WebP logo. The full mark will fit inside the preview with padding." value={logoPreview} onChange={(url) => { setLogoFailed(false); setForm((f) => ({ ...f, logoUrl: url })) }} aspectClassName="min-h-56 md:max-w-sm md:aspect-square bg-card p-6" imageClassName="object-contain p-6" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Company Name</label>
                  <Input 
                    value={form.companyName}
                    onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Phone</label>
                  <Input 
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+254 799 010 210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-border/80 bg-elevated px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-slate-400/70 transition focus:border-primary/60 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  placeholder="Tell visitors what your company offers at expos."
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-600">Expo Categories</label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categoriesQuery.data.items.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-elevated px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.categories.includes(category.name)}
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          categories: event.target.checked
                            ? [...current.categories, category.name]
                            : current.categories.filter((item) => item !== category.name)
                        }))}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Address</label>
                  <Input 
                    value={form.address}
                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Nairobi, Kenya"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleSave} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "documents" && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Company Documents</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Upload PDF company documents such as brochures, capability statements, certificates, and product sheets.</p>
            </div>
            <Button type="button" onClick={() => setDocumentDialogOpen(true)}>Add Document</Button>
          </div>

          <DataTable<CompanyDocument>
            rows={documentsQuery.data || []}
            emptyTitle="No company documents"
            emptyDescription="Upload PDF documents that support your exhibitor profile and expo workspace."
            columns={[
              {
                key: "name",
                header: "Document",
                sortable: true,
                sortValue: (document) => document.name,
                render: (document) => (
                  <div>
                    <p className="font-semibold text-foreground">{document.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">PDF document</p>
                  </div>
                )
              },
              {
                key: "size",
                header: "Size",
                sortable: true,
                sortValue: (document) => document.size,
                render: (document) => formatFileSize(document.size)
              },
              {
                key: "uploadedAt",
                header: "Uploaded",
                sortable: true,
                sortValue: (document) => document.uploadedAt,
                render: (document) => formatDate(document.uploadedAt)
              },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (document) => (
                  <div className="flex justify-end gap-2">
                    <a href={mediaUrl(document.url)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary">
                      View
                    </a>
                    <Button type="button" size="sm" variant="danger" disabled={documentDeleteMutation.isPending} onClick={() => handleDocumentRemove(document)}>
                      Remove
                    </Button>
                  </div>
                )
              }
            ]}
          />

          {documentDialogOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="document-dialog-title" onClick={() => !documentMutation.isPending && setDocumentDialogOpen(false)}>
              <form
                onSubmit={handleDocumentSubmit}
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-border/70 bg-elevated/70 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Company Documents</p>
                  <h2 id="document-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Add Document</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Upload one PDF at a time. Use a clear name so your team can find it later.</p>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Document Name</label>
                    <Input required autoFocus minLength={2} maxLength={140} placeholder="Company profile brochure" value={documentForm.name} onChange={(event) => setDocumentForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">PDF File</label>
                    <input
                      required
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => setDocumentForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                      className="block w-full rounded-xl border border-dashed border-border/80 bg-elevated px-4 py-5 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-primary/40"
                    />
                    <p className="text-xs leading-5 text-slate-500">{documentForm.file ? `${documentForm.file.name} · ${formatFileSize(documentForm.file.size)}` : "Only PDF files are accepted."}</p>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={documentMutation.isPending} onClick={() => setDocumentDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={documentMutation.isPending}>{documentMutation.isPending ? "Uploading..." : "Upload Document"}</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === "social" && (
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full -mr-20 -mt-20" />
          <div className="relative">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Social Media Links</h3>
              <p className="text-sm text-slate-500">Connect your social profiles</p>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">LinkedIn</label>
                  <Input 
                    value={form.linkedin}
                    onChange={(e) => setForm(f => ({ ...f, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Twitter</label>
                  <Input 
                    value={form.twitter}
                    onChange={(e) => setForm(f => ({ ...f, twitter: e.target.value }))}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Instagram</label>
                  <Input 
                    value={form.instagram}
                    onChange={(e) => setForm(f => ({ ...f, instagram: e.target.value }))}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleSave} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "meetingCategories" && (
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Meeting Setup</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Meeting Categories</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Create the labels your team uses when scheduling visitor meetings, product demos, and follow-ups.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddMeetingCategory} className="mt-6 grid gap-3 rounded-2xl border border-border/70 bg-elevated/50 p-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">New Category</label>
              <Input
                value={meetingCategoryInput}
                onChange={(event) => setMeetingCategoryInput(event.target.value)}
                placeholder="Online Demo"
                maxLength={80}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={meetingCategoriesMutation.isPending} className="w-full sm:w-auto">
                {meetingCategoriesMutation.isPending ? "Saving..." : "Add Category"}
              </Button>
            </div>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {meetingCategories.map((category) => (
              <div key={category} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{category}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Available in the meeting form</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={meetingCategoriesMutation.isPending}
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => handleRemoveMeetingCategory(category)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-slate-600">
            These categories appear in your expo workspace when scheduling a visitor meeting. Existing meetings keep their saved category text.
          </div>
        </Card>
      )}

      {activeTab === "team" && (
        <div className="space-y-5">
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Team Member List</h3>
                <p className="mt-1 text-sm text-slate-500">Active people connected to this exhibitor account.</p>
              </div>
              <Button type="button" onClick={() => setTeamDialogOpen(true)}>Add Team Member</Button>
            </div>
            <DataTable<ExhibitorTeamMember>
              rows={teamQuery.data || []}
              emptyTitle="No team members"
              emptyDescription="Add your first team member to help manage the exhibitor workspace."
              columns={[
                {
                  key: "name",
                  header: "Member",
                  sortable: true,
                  sortValue: (member) => member.name,
                  render: (member) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{member.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  )
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  sortValue: (member) => member.status,
                  render: (member) => <StatusBadge value={member.status} />
                },
                {
                  key: "createdAt",
                  header: "Added",
                  sortable: true,
                  sortValue: (member) => member.createdAt || "",
                  render: (member) => member.createdAt ? formatDate(member.createdAt) : "Account owner"
                },
                {
                  key: "actions",
                  header: "Actions",
                  className: "text-right",
                  render: (member) => member.role === "owner" ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Owner</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => openEditMember(member)}>Edit</Button>
                      {canRemoveTeamMember(member) ? (
                        <Button type="button" variant="danger" size="sm" onClick={() => setMemberToRemove(member)}>Remove</Button>
                      ) : (
                        <Button type="button" variant="secondary" size="sm" disabled>You</Button>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </div>
          {teamDialogOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" onClick={() => !teamMutation.isPending && setTeamDialogOpen(false)}>
              <form
                onSubmit={handleTeamSubmit}
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-border/70 bg-elevated/70 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Exhibitor Team</p>
                  <h2 id="team-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Add Team Member</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Invite internal people who support product updates, lead follow-up, and expo operations.</p>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Name</label>
                    <Input required autoFocus minLength={2} maxLength={120} placeholder="Amina Otieno" value={teamForm.name} onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Email</label>
                    <Input required type="email" maxLength={160} placeholder="amina@company.com" value={teamForm.email} onChange={(event) => setTeamForm((current) => ({ ...current, email: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Temporary Password</label>
                    <Input required type="text" minLength={8} maxLength={72} placeholder="Create a temporary password" value={teamForm.temporaryPassword} onChange={(event) => setTeamForm((current) => ({ ...current, temporaryPassword: event.target.value }))} />
                    <p className="text-xs leading-5 text-slate-500">The member will receive this temporary password by email, followed by a welcome email and a founder note.</p>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={teamMutation.isPending} onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={teamMutation.isPending}>{teamMutation.isPending ? "Adding..." : "Add Team Member"}</Button>
                </div>
              </form>
            </div>
          )}
          {editingMember && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="team-edit-dialog-title" onClick={() => !teamUpdateMutation.isPending && setEditingMember(null)}>
              <form
                onSubmit={handleTeamEditSubmit}
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="border-b border-border/70 bg-elevated/70 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Exhibitor Team</p>
                  <h2 id="team-edit-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Edit Team Member</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Update the member details or deactivate access from this exhibitor workspace.</p>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Name</label>
                    <Input required autoFocus minLength={2} maxLength={120} placeholder="Amina Otieno" value={teamEditForm.name} onChange={(event) => setTeamEditForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Email</label>
                    <Input required type="email" maxLength={160} placeholder="amina@company.com" value={teamEditForm.email} onChange={(event) => setTeamEditForm((current) => ({ ...current, email: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Status</label>
                    <select value={teamEditForm.status} onChange={(event) => setTeamEditForm((current) => ({ ...current, status: event.target.value as "active" | "inactive" }))} className="h-12 w-full rounded-xl border border-border/80 bg-elevated px-4 text-sm text-foreground shadow-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={teamUpdateMutation.isPending} onClick={() => setEditingMember(null)}>Cancel</Button>
                  <Button type="submit" disabled={teamUpdateMutation.isPending}>{teamUpdateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            </div>
          )}
          {memberToRemove && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="team-remove-dialog-title" onClick={() => !teamDeleteMutation.isPending && setMemberToRemove(null)}>
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card shadow-shell" onClick={(event) => event.stopPropagation()}>
                <div className="px-6 py-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-red-500">Remove Access</p>
                  <h2 id="team-remove-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Remove team member?</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {memberToRemove.name} will be removed from this exhibitor team. This action is saved in audit logs.
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/70 px-6 py-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" disabled={teamDeleteMutation.isPending} onClick={() => setMemberToRemove(null)}>Cancel</Button>
                  <Button type="button" variant="danger" disabled={teamDeleteMutation.isPending} onClick={() => teamDeleteMutation.mutate(memberToRemove)}>{teamDeleteMutation.isPending ? "Removing..." : "Remove"}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB"
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString()} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function cleanMeetingCategoryList(values: string[]) {
  const seen = new Set<string>()
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
