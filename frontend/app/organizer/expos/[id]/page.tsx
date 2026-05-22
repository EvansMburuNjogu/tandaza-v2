"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { StatusBadge } from "@/components/admin/status-badge"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ErrorState } from "@/components/ui/error-state"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { ExpoRecord } from "@/lib/api/contracts"
import { formatCurrency, mediaUrl, safeDisplay } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

type Tab = "overview" | "exhibitors" | "payments" | "analytics" | "visitors"

export default function OrganizerExpoDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const client = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const expoQuery = useQuery({ queryKey: ["organizer-expo", params.id], queryFn: () => api.getOrganizerExpo(token || "", params.id), enabled: Boolean(token && params.id) })
  const exhibitorsQuery = useQuery({ queryKey: ["organizer-exhibitors"], queryFn: () => api.getOrganizerExhibitors(token || ""), enabled: Boolean(token) })
  const paymentsQuery = useQuery({ queryKey: ["organizer-payments"], queryFn: () => api.getOrganizerPayments(token || ""), enabled: Boolean(token) })
  const visitorsQuery = useQuery({ queryKey: ["organizer-visitors"], queryFn: () => api.getOrganizerVisitors(token || ""), enabled: Boolean(token) })
  const reportsQuery = useQuery({ queryKey: ["organizer-reports"], queryFn: () => api.getOrganizerReports(token || ""), enabled: Boolean(token) })
  const submitMutation = useMutation({
    mutationFn: (expo: ExpoRecord) => api.submitOrganizerExpo(token || "", expo.id),
    onSuccess: async () => {
      toast.success("Expo submitted for review")
      await client.invalidateQueries({ queryKey: ["organizer-expo", params.id] })
      await client.invalidateQueries({ queryKey: ["organizer-expos"] })
    },
    onError: (error) => toast.error("Could not submit expo", { description: error instanceof Error ? error.message : "Try again." })
  })

  if (expoQuery.isError) return <ErrorState onRetry={() => expoQuery.refetch()} />
  if (expoQuery.isLoading || !expoQuery.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const expo = expoQuery.data
  const canEdit = expo.status === "draft" || expo.status === "needs_changes"
  const image = mediaUrl(expo.coverImageUrl || expo.coverImage)
  const exhibitors = (exhibitorsQuery.data?.items || []).filter((item) => item.assignedExpos === expo.name)
  const payments = (paymentsQuery.data?.items || []).filter((item) => item.expoName === expo.name)
  const visitors = (visitorsQuery.data?.items || []).filter((item) => item.exposAttended > 0)
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "exhibitors", label: "Exhibitors", count: exhibitors.length },
    { id: "payments", label: "Payments", count: payments.length },
    { id: "analytics", label: "Analytics" },
    { id: "visitors", label: "Visitors", count: visitors.length }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={expo.name}
        description="Manage the operational view of this expo."
        actions={<BackLink href="/organizer/expos" label="Back to Expos" />}
      />

      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={expo.status.replaceAll("_", " ")} />
              <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-slate-500">{expo.countryCode || "Country pending"}</span>
              <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-slate-500">{expo.currency || "Currency pending"}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{expo.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{expo.description || "No description added yet."}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Exhibitors" value={String(expo.exhibitors)} />
              <Metric label="Payments" value={formatCurrency(revenue, expo.currency)} />
              <Metric label="Visitors" value={String(visitors.length)} />
              <Metric label="Activation Fee" value={formatCurrency(expo.exhibitorFee, expo.currency)} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {canEdit && <Link href={`/organizer/expos/${expo.id}/edit`}><Button variant="secondary">Edit Draft</Button></Link>}
              {canEdit && <Button onClick={() => submitMutation.mutate(expo)} disabled={submitMutation.isPending}>{submitMutation.isPending ? "Submitting..." : "Submit for Review"}</Button>}
            </div>
          </div>
          <div className="min-h-64 bg-elevated">
            {image ? <img src={image} alt={expo.name} className="h-full w-full object-cover" /> : <div className="flex h-full min-h-64 items-center justify-center text-sm font-semibold text-slate-400">Expo image</div>}
          </div>
        </div>
      </Card>

      <div className="flex gap-1 overflow-x-auto border-b border-border/80">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${activeTab === tab.id ? "border-b-2 border-primary text-primary" : "text-slate-500 hover:text-foreground"}`}>
            {tab.label}{typeof tab.count === "number" ? ` (${tab.count})` : ""}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <Overview expo={expo} />}
      {activeTab === "exhibitors" && <SimpleTable headers={["Company", "Email", "Status"]} rows={exhibitors.map((item) => [safeDisplay(item.company), safeDisplay(item.email), item.status])} empty="No exhibitors assigned to this expo yet." />}
      {activeTab === "payments" && <SimpleTable headers={["Reference", "Payer", "Amount", "Status"]} rows={payments.map((item) => [item.reference, safeDisplay(item.payerName), formatCurrency(item.amount, item.currency), item.status])} empty="No payments recorded for this expo yet." />}
      {activeTab === "analytics" && <Analytics reports={reportsQuery.data} />}
      {activeTab === "visitors" && <SimpleTable headers={["Visitor", "Interactions", "Last Activity", "Status"]} rows={visitors.map((item) => [safeDisplay(item.name), String(item.interactions), item.lastActivity || "Not recorded", item.status])} empty="No visitor activity recorded yet." />}
    </div>
  )
}

function Overview({ expo }: { expo: ExpoRecord }) {
  return (
    <Card className="p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Location" value={expo.location} />
        <Info label="Dates" value={expo.dates} />
        <Info label="Timezone" value={expo.timezone || "Not set"} />
        <Info label="Organizer Commission" value={`${expo.organizerCommissionRate || 0}%`} />
        <Info label="Categories" value={expo.categories?.map((category) => category.name).join(", ") || "None selected"} />
      </div>
    </Card>
  )
}

function Analytics({ reports }: { reports?: any }) {
  const metrics = reports?.expoPerformance || reports?.performance || []
  return <div className="grid gap-4 md:grid-cols-3">{metrics.map((item: any) => <Card key={item.label} className="p-5"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.delta}</p></Card>)}</div>
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <Card className="p-8 text-center text-sm text-slate-500">{empty}</Card>
  return <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-elevated text-left text-xs uppercase tracking-[0.16em] text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-600">{cell}</td>)}</tr>)}</tbody></table></div></Card>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 font-semibold text-foreground">{value}</p></div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-elevated p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-sm font-medium text-foreground">{value}</p></div>
}
