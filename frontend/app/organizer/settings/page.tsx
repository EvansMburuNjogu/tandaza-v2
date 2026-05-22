"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSessionStore } from "@/store/session-store"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { mediaUrl } from "@/lib/utils"

type PayoutMethod = "bank" | "mobile_money" | "manual" | ""

export default function OrganizerSettingsPage() {
  const token = useSessionStore((s) => s.token)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "payout">("profile")
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    logoUrl: "",
    phone: "",
    address: "",
    payoutMethod: "bank" as PayoutMethod,
    payoutAccountName: "",
    payoutBankName: "",
    payoutAccountNumber: "",
    payoutBankBranch: "",
    payoutSwiftCode: "",
    payoutMobileProvider: "",
    payoutMobileNumber: "",
    payoutNotes: "",
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  })

  const profileQuery = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: () => api.getOrganizerProfile(token || ""),
    enabled: Boolean(token)
  })

  useEffect(() => {
    if (!profileQuery.data) return
    setForm({
      name: profileQuery.data.name,
      companyName: profileQuery.data.companyName,
      logoUrl: profileQuery.data.logoUrl || "",
      phone: profileQuery.data.phone || "",
      address: profileQuery.data.address || "",
      payoutMethod: (profileQuery.data.payoutMethod || "bank") as PayoutMethod,
      payoutAccountName: profileQuery.data.payoutAccountName || "",
      payoutBankName: profileQuery.data.payoutBankName || "",
      payoutAccountNumber: profileQuery.data.payoutAccountNumber || "",
      payoutBankBranch: profileQuery.data.payoutBankBranch || "",
      payoutSwiftCode: profileQuery.data.payoutSwiftCode || "",
      payoutMobileProvider: profileQuery.data.payoutMobileProvider || "",
      payoutMobileNumber: profileQuery.data.payoutMobileNumber || "",
      payoutNotes: profileQuery.data.payoutNotes || "",
      emailNotifications: profileQuery.data.emailNotifications,
      smsNotifications: profileQuery.data.smsNotifications,
      pushNotifications: profileQuery.data.pushNotifications
    })
  }, [profileQuery.data])

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("Upload a PNG, JPG, or WebP logo.")
      if (file.size > 4 * 1024 * 1024) throw new Error("Logo must be 4 MB or smaller.")
      return api.uploadMedia(token || "", file, "organizer_logo")
    },
    onSuccess: (media) => {
      setForm((value) => ({ ...value, logoUrl: media.url }))
      toast.success("Logo uploaded. Save changes to update your profile.")
    },
    onError: (error) => toast.error("Could not upload logo", { description: error instanceof Error ? error.message : "Try another image." })
  })

  const profileMutation = useMutation({
    mutationFn: () => api.updateOrganizerProfile(token || "", form),
    onSuccess: async () => {
      toast.success("Profile updated")
      await profileQuery.refetch()
    },
    onError: (error) => toast.error("Could not save profile", { description: error instanceof Error ? error.message : "Try again." })
  })

  const handleSave = () => {
    if (!form.name.trim() || !form.companyName.trim()) {
      toast.error("Check profile details", { description: "Full name and company name are required." })
      return
    }
    if (activeTab === "payout") {
      if (!form.payoutMethod) {
        toast.error("Choose payout method", { description: "Select how Tandaza should pay settlement funds." })
        return
      }
      if (form.payoutMethod === "bank" && (!form.payoutAccountName.trim() || !form.payoutBankName.trim() || !form.payoutAccountNumber.trim())) {
        toast.error("Check bank details", { description: "Account name, bank name, and account number are required." })
        return
      }
      if (form.payoutMethod === "mobile_money" && (!form.payoutAccountName.trim() || !form.payoutMobileProvider.trim() || !form.payoutMobileNumber.trim())) {
        toast.error("Check mobile money details", { description: "Account name, provider, and mobile number are required." })
        return
      }
    }
    profileMutation.mutate()
  }

  if (profileQuery.isError) return <ErrorState onRetry={() => profileQuery.refetch()} />
  if (profileQuery.isLoading || !profileQuery.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const logoPreview = mediaUrl(form.logoUrl)
  const initials = (form.companyName || form.name || "O").trim().slice(0, 1).toUpperCase()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Profile"
        description="Manage your organizer identity and payout details used for settlement invoices."
      />

      <Card className="overflow-hidden border-border/80 p-0 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border/70 bg-elevated/50 p-2 sm:flex-row">
          {[
            { id: "profile", label: "Company Profile" },
            { id: "payout", label: "Payout Payment Method" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "profile" | "payout")}
              className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" ? (
          <>
        <div className="border-b border-border/70 bg-elevated/50 px-6 py-5">
          <h3 className="text-lg font-semibold text-foreground">Profile Information</h3>
          <p className="mt-1 text-sm text-slate-500">Keep your company identity and contact details current.</p>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-elevated">
                {logoPreview ? (
                  <img src={logoPreview} alt={`${form.companyName || "Organizer"} logo`} className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-2xl font-semibold text-primary">{initials}</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{form.companyName || profileQuery.data.companyName}</p>
                <p className="mt-1 text-sm text-slate-500">{profileQuery.data.email}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Upload a clean square PNG, JPG, or WebP logo.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  event.currentTarget.value = ""
                }}
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Full Name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Email Address</label>
              <Input value={profileQuery.data.email} placeholder="your@email.com" disabled />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Company Name</label>
              <Input
                value={form.companyName}
                onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))}
                placeholder="Your company"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Phone Number</label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                placeholder="+254 700 000 000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Address</label>
            <Input
              value={form.address}
              onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))}
              placeholder="Nairobi, Kenya"
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={handleSave} disabled={profileMutation.isPending || uploadMutation.isPending}>
              {profileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
          </>
        ) : (
          <>
            <div className="border-b border-border/70 bg-elevated/50 px-6 py-5">
              <h3 className="text-lg font-semibold text-foreground">Payout Payment Method</h3>
              <p className="mt-1 text-sm text-slate-500">These details appear on settlement invoices and guide payout processing.</p>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Payment Method</label>
                  <Select
                    value={form.payoutMethod}
                    onChange={(event) => setForm((value) => ({ ...value, payoutMethod: event.target.value as PayoutMethod }))}
                  >
                    <option value="bank">Bank transfer</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="manual">Manual settlement</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Account Name</label>
                  <Input
                    value={form.payoutAccountName}
                    onChange={(event) => setForm((value) => ({ ...value, payoutAccountName: event.target.value }))}
                    placeholder="Registered payout account name"
                  />
                </div>
              </div>

              {form.payoutMethod === "bank" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Bank Name</label>
                      <Input
                        value={form.payoutBankName}
                        onChange={(event) => setForm((value) => ({ ...value, payoutBankName: event.target.value }))}
                        placeholder="Equity Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Account Number</label>
                      <Input
                        value={form.payoutAccountNumber}
                        onChange={(event) => setForm((value) => ({ ...value, payoutAccountNumber: event.target.value }))}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Branch</label>
                      <Input
                        value={form.payoutBankBranch}
                        onChange={(event) => setForm((value) => ({ ...value, payoutBankBranch: event.target.value }))}
                        placeholder="Westlands"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">SWIFT Code</label>
                      <Input
                        value={form.payoutSwiftCode}
                        onChange={(event) => setForm((value) => ({ ...value, payoutSwiftCode: event.target.value.toUpperCase() }))}
                        placeholder="EQBLKENA"
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {form.payoutMethod === "mobile_money" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Mobile Money Provider</label>
                    <Input
                      value={form.payoutMobileProvider}
                      onChange={(event) => setForm((value) => ({ ...value, payoutMobileProvider: event.target.value }))}
                      placeholder="M-Pesa"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Mobile Number</label>
                    <Input
                      value={form.payoutMobileNumber}
                      onChange={(event) => setForm((value) => ({ ...value, payoutMobileNumber: event.target.value }))}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Payout Notes</label>
                <Textarea
                  value={form.payoutNotes}
                  onChange={(event) => setForm((value) => ({ ...value, payoutNotes: event.target.value }))}
                  placeholder="Add settlement instructions, reference notes, or finance contact details."
                  rows={4}
                />
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={handleSave} disabled={profileMutation.isPending || uploadMutation.isPending}>
                  {profileMutation.isPending ? "Saving..." : "Save Payout Details"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
