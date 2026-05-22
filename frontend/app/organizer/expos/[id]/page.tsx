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
import { formatCurrency, formatDate, mediaUrl, safeDisplay } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

type Tab = "overview" | "exhibitors" | "visitors" | "payments" | "analytics" | "feedback"

export default function OrganizerExpoDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const client = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const expoQuery = useQuery({ queryKey: ["organizer-expo", params.id], queryFn: () => api.getOrganizerExpo(token || "", params.id), enabled: Boolean(token && params.id) })
  const exhibitorsQuery = useQuery({ queryKey: ["organizer-exhibitors"], queryFn: () => api.getOrganizerExhibitors(token || ""), enabled: Boolean(token) })
  const paymentsQuery = useQuery({ queryKey: ["organizer-payments"], queryFn: () => api.getOrganizerPayments(token || ""), enabled: Boolean(token) })
  const visitorsQuery = useQuery({ queryKey: ["organizer-visitors"], queryFn: () => api.getOrganizerVisitors(token || ""), enabled: Boolean(token) })
  const feedbackQuery = useQuery({ queryKey: ["organizer-feedback"], queryFn: () => api.getOrganizerFeedback(token || ""), enabled: Boolean(token) })
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
  const exhibitors = (exhibitorsQuery.data?.items || []).filter((item) =>
    (item.assignedExpoList || []).some((assigned) => assigned.id === expo.id || assigned.name === expo.name) ||
    item.assignedExpos === expo.name
  )
  const payments = (paymentsQuery.data?.items || []).filter((item) => item.expoName === expo.name)
  const visitors = (visitorsQuery.data?.items || []).filter((item) => (item.visitedExpos || []).some((visited) => visited.id === expo.id || visited.name === expo.name))
  const feedback = (feedbackQuery.data || []).filter((item) => item.expoId === expo.id || item.expoName === expo.name)
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const paidPayments = payments.filter((payment) => payment.status === "paid")
  const paidRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const activeExhibitors = exhibitors.filter((item) => item.status === "active").length
  const activationRate = exhibitors.length ? Math.round((activeExhibitors / exhibitors.length) * 100) : 0
  const visitorInteractions = visitors.reduce((sum, visitor) => {
    const expoVisit = (visitor.visitedExpos || []).find((visited) => visited.id === expo.id || visited.name === expo.name)
    return sum + (expoVisit?.interactions || 0)
  }, 0)
  const averageFeedback = feedback.length ? (feedback.reduce((sum, item) => sum + (Number.isFinite(item.rating) ? item.rating : 0), 0) / feedback.length).toFixed(1) : "0.0"
  const commissionAmount = Math.round((paidRevenue * (expo.organizerCommissionRate || 0)) / 100)
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "exhibitors", label: "Exhibitors", count: exhibitors.length },
    { id: "visitors", label: "Visitors", count: visitors.length },
    { id: "payments", label: "Payments", count: payments.length },
    { id: "analytics", label: "Analytics" },
    { id: "feedback", label: "Feedback", count: feedback.length }
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
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{expo.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{expo.description || "No description added yet."}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full border border-border bg-card px-3 py-1">{expo.venue || "Venue pending"}</span>
              <span className="rounded-full border border-border bg-card px-3 py-1">{expo.city || "City pending"}</span>
              <span className="rounded-full border border-border bg-card px-3 py-1">{expo.dates}</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Exhibitors" value={String(exhibitors.length)} detail={`${activeExhibitors} active`} />
              <Metric label="Visitors" value={String(visitors.length)} detail={`${visitorInteractions} interactions`} />
              <Metric label="Paid Revenue" value={formatCurrency(paidRevenue, expo.currency)} detail={`${payments.length} payment records`} />
              <Metric label="Commission" value={formatCurrency(commissionAmount, expo.currency)} detail={`${expo.organizerCommissionRate || 0}% organizer rate`} />
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

      {activeTab === "overview" && (
        <Overview
          expo={expo}
          activationRate={activationRate}
          paidRevenue={paidRevenue}
          commissionAmount={commissionAmount}
          visitors={visitors.length}
          visitorInteractions={visitorInteractions}
          feedbackScore={averageFeedback}
        />
      )}
      {activeTab === "exhibitors" && <SimpleTable headers={["Company", "Email", "Status", "Assigned"]} rows={exhibitors.map((item) => [safeDisplay(item.company), safeDisplay(item.email), item.status, formatDate(item.createdAt)])} empty="No exhibitors assigned to this expo yet." />}
      {activeTab === "visitors" && <SimpleTable headers={["Visitor", "Email", "Interactions", "Last Visit"]} rows={visitors.map((item) => {
        const visit = (item.visitedExpos || []).find((visited) => visited.id === expo.id || visited.name === expo.name)
        return [safeDisplay(item.name), safeDisplay(item.email), String(visit?.interactions || item.interactions || 0), formatDate(visit?.lastActivity || item.lastActivity)]
      })} empty="No visitor activity recorded for this expo yet." />}
      {activeTab === "payments" && <SimpleTable headers={["Reference", "Payer", "Amount", "Status"]} rows={payments.map((item) => [item.reference, safeDisplay(item.payerName), formatCurrency(item.amount, item.currency), item.status])} empty="No payments recorded for this expo yet." />}
      {activeTab === "analytics" && <Analytics expo={expo} exhibitors={exhibitors.length} activeExhibitors={activeExhibitors} visitors={visitors.length} interactions={visitorInteractions} payments={payments.length} paidRevenue={paidRevenue} commissionAmount={commissionAmount} feedbackScore={averageFeedback} reports={reportsQuery.data} />}
      {activeTab === "feedback" && <SimpleTable headers={["Exhibitor", "Rating", "Category", "Comment", "Submitted"]} rows={feedback.map((item) => [safeDisplay(item.respondentName), `${item.rating}/5`, item.category, item.comment || "No comment", formatDate(item.createdAt)])} empty="No exhibitor feedback submitted for this expo yet." />}
    </div>
  )
}

function Overview({
  expo,
  activationRate,
  paidRevenue,
  commissionAmount,
  visitors,
  visitorInteractions,
  feedbackScore
}: {
  expo: ExpoRecord
  activationRate: number
  paidRevenue: number
  commissionAmount: number
  visitors: number
  visitorInteractions: number
  feedbackScore: string
}) {
  const timeline = [
    { label: "Start", value: formatDate(expo.startDate) },
    { label: "End", value: formatDate(expo.endDate) },
    { label: "Timezone", value: expo.timezone || "Not set" }
  ]
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Operational Snapshot</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">What needs attention</h3>
          </div>
          <StatusBadge value={expo.status.replaceAll("_", " ")} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Info label="Location" value={expo.location || `${expo.venue || "Venue pending"}, ${expo.city || "City pending"}`} />
          <Info label="Categories" value={expo.categories?.map((category) => category.name).join(", ") || "None selected"} />
          <Info label="Activation Fee" value={formatCurrency(expo.exhibitorFee, expo.currency)} />
          <Info label="Ads Add-on" value={formatCurrency(expo.adsAddonFee || 0, expo.currency)} />
          <Info label="Organizer Commission" value={`${expo.organizerCommissionRate || 0}% (${formatCurrency(commissionAmount, expo.currency)} earned)`} />
          <Info label="Paid Revenue" value={formatCurrency(paidRevenue, expo.currency)} />
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Performance</p>
        <div className="mt-5 space-y-5">
          <Progress label="Exhibitor activation" value={activationRate} detail={`${activationRate}% active`} />
          <Progress label="Visitor engagement" value={Math.min(100, visitorInteractions * 10)} detail={`${visitors} visitors, ${visitorInteractions} interactions`} />
          <Progress label="Feedback score" value={Math.min(100, Number(feedbackScore) * 20)} detail={`${feedbackScore}/5 average`} />
        </div>
      </Card>

      <Card className="p-6 xl:col-span-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Timeline</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {timeline.map((item) => <Info key={item.label} label={item.label} value={item.value} />)}
        </div>
      </Card>
    </div>
  )
}

function Analytics({
  expo,
  exhibitors,
  activeExhibitors,
  visitors,
  interactions,
  payments,
  paidRevenue,
  commissionAmount,
  feedbackScore,
  reports
}: {
  expo: ExpoRecord
  exhibitors: number
  activeExhibitors: number
  visitors: number
  interactions: number
  payments: number
  paidRevenue: number
  commissionAmount: number
  feedbackScore: string
  reports?: any
}) {
  const metrics = [
    { label: "Exhibitor Activation", value: `${activeExhibitors}/${exhibitors}`, delta: "active workspaces" },
    { label: "Visitor Engagement", value: String(interactions), delta: `${visitors} unique visitors` },
    { label: "Paid Revenue", value: formatCurrency(paidRevenue, expo.currency), delta: `${payments} payment records` },
    { label: "Commission Earned", value: formatCurrency(commissionAmount, expo.currency), delta: `${expo.organizerCommissionRate || 0}% organizer rate` },
    { label: "Feedback Score", value: `${feedbackScore}/5`, delta: "exhibitor feedback" }
  ]
  const reportMetrics = reports?.expoPerformance || reports?.performance || []
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item) => <Card key={item.label} className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.delta}</p></Card>)}
      </div>
      <Card className="p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Organizer Signals</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <MiniBar label="Activation" value={exhibitors ? Math.round((activeExhibitors / exhibitors) * 100) : 0} />
          <MiniBar label="Engagement" value={Math.min(100, interactions * 10)} />
          <MiniBar label="Feedback" value={Math.min(100, Number(feedbackScore) * 20)} />
        </div>
      </Card>
      {Array.isArray(reportMetrics) && reportMetrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {reportMetrics.map((item: any) => <Card key={item.label} className="p-5"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.delta}</p></Card>)}
        </div>
      )}
    </div>
  )
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <Card className="p-8 text-center text-sm text-slate-500">{empty}</Card>
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-600">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-lg font-semibold text-foreground">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-elevated p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-sm font-medium text-foreground">{value}</p></div>
}

function Progress({ label, value, detail }: { label: string; value: number; detail: string }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-elevated">
        <div className="h-full rounded-full bg-primary" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-sm font-semibold text-primary">{safeValue}%</span>
      </div>
      <div className="mt-3 h-28 rounded-2xl bg-elevated p-3">
        <div className="flex h-full items-end">
          <div className="w-full rounded-xl bg-primary" style={{ height: `${Math.max(6, safeValue)}%` }} />
        </div>
      </div>
    </div>
  )
}
