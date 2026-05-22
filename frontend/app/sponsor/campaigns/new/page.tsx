"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SessionGuard } from "@/components/auth/session-guard"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BackLink } from "@/components/ui/back-link"
import { toast } from "sonner"

export default function NewCampaignPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "",
    objective: "",
    budget: 0,
    startDate: "",
    endDate: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Campaign created successfully!")
    router.push("/sponsor/campaigns")
  }

  return (
    <SessionGuard allowedRoles={["sponsorship"]}>
      <div className="space-y-6">
        <PageHeader
          title="Create Campaign"
          description="Create a new advertising campaign"
          actions={<BackLink href="/sponsor/campaigns" label="Back to Campaigns" />}
        />

        <Card className="max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Campaign Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Summer Tech Promo"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Objective</label>
              <textarea
                value={form.objective}
                onChange={(e) => setForm(f => ({ ...f, objective: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm"
                placeholder="Describe the goal of this campaign..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Budget</label>
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm(f => ({ ...f, budget: parseInt(e.target.value) || 0 }))}
                placeholder="50000"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button type="submit">Create Campaign</Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/sponsor/campaigns")}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </SessionGuard>
  )
}
