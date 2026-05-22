"use client"

import Link from "next/link"
import { ReactNode, useState } from "react"
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
import { ExpoRecord, ExhibitorRecord, OrganizerFeedback, OrganizerReportsResponse, PaymentRecord, VisitorRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate, mediaUrl, safeDisplay } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

type Tab = "overview" | "exhibitors" | "visitors" | "payments" | "analytics" | "feedback"
const chartPalette = ["hsl(var(--primary))", "#14b8a6", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6", "#06b6d4"]

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
  const dailyReport = buildDailyReport(expo, payments, visitors, feedback)
  const exhibitorPerformance = buildExhibitorPerformance(exhibitors, payments)
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
          dailyReport={dailyReport}
          bestExhibitors={exhibitorPerformance}
        />
      )}
      {activeTab === "exhibitors" && <ExhibitorsTable rows={exhibitors} performance={exhibitorPerformance} />}
      {activeTab === "visitors" && <VisitorsTable rows={visitors} expo={expo} />}
      {activeTab === "payments" && <PaymentsTable rows={payments} expo={expo} />}
      {activeTab === "analytics" && <Analytics expo={expo} exhibitors={exhibitors.length} activeExhibitors={activeExhibitors} visitors={visitors.length} interactions={visitorInteractions} payments={payments.length} paidRevenue={paidRevenue} commissionAmount={commissionAmount} feedbackScore={averageFeedback} reports={reportsQuery.data} dailyReport={dailyReport} bestExhibitors={exhibitorPerformance} />}
      {activeTab === "feedback" && <FeedbackTable rows={feedback} />}
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
  feedbackScore,
  dailyReport,
  bestExhibitors
}: {
  expo: ExpoRecord
  activationRate: number
  paidRevenue: number
  commissionAmount: number
  visitors: number
  visitorInteractions: number
  feedbackScore: string
  dailyReport: DailyReportRow[]
  bestExhibitors: ExhibitorPerformanceRow[]
}) {
  const timeline = [
    { label: "Start", value: formatDate(expo.startDate) },
    { label: "End", value: formatDate(expo.endDate) },
    { label: "Timezone", value: expo.timezone || "Not set" }
  ]
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.10),transparent_42%),hsl(var(--card))] p-6 shadow-card">
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

      <Card className="p-6 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Performance</p>
        <div className="mt-5 space-y-5">
          <Progress label="Exhibitor activation" value={activationRate} detail={`${activationRate}% active`} />
          <Progress label="Visitor engagement" value={Math.min(100, visitorInteractions * 10)} detail={`${visitors} visitors, ${visitorInteractions} interactions`} />
          <Progress label="Feedback score" value={Math.min(100, Number(feedbackScore) * 20)} detail={`${feedbackScore}/5 average`} />
        </div>
      </Card>

      <Card className="p-6 shadow-card xl:col-span-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Timeline</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {timeline.map((item) => <Info key={item.label} label={item.label} value={item.value} />)}
        </div>
      </Card>

      <Card className="p-6 shadow-card xl:col-span-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Daily Expo Report</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Performance by expo day</h3>
          </div>
          <p className="text-sm text-slate-500">Payments, visitors, interactions, and feedback submitted each day.</p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <DailyReportChart rows={dailyReport} currency={expo.currency} />
          <BestExhibitorsPanel rows={bestExhibitors} />
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
  reports,
  dailyReport,
  bestExhibitors
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
  reports?: OrganizerReportsResponse
  dailyReport: DailyReportRow[]
  bestExhibitors: ExhibitorPerformanceRow[]
}) {
  const metrics = [
    { label: "Exhibitor Activation", value: `${activeExhibitors}/${exhibitors}`, delta: "active workspaces" },
    { label: "Visitor Engagement", value: String(interactions), delta: `${visitors} unique visitors` },
    { label: "Paid Revenue", value: formatCurrency(paidRevenue, expo.currency), delta: `${payments} payment records` },
    { label: "Commission Earned", value: formatCurrency(commissionAmount, expo.currency), delta: `${expo.organizerCommissionRate || 0}% organizer rate` },
    { label: "Feedback Score", value: `${feedbackScore}/5`, delta: "exhibitor feedback" }
  ]
  const reportMetrics = reports?.expoPerformance || []
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="p-6 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Daily Aggregation</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Activity across each expo day</h3>
          <div className="mt-6">
            <DailyReportChart rows={dailyReport} currency={expo.currency} />
          </div>
        </Card>
        <BestExhibitorsPanel rows={bestExhibitors} />
      </div>
      {Array.isArray(reportMetrics) && reportMetrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {reportMetrics.map((item: any) => <Card key={item.label} className="p-5"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.delta}</p></Card>)}
        </div>
      )}
    </div>
  )
}

function ExhibitorsTable({ rows, performance }: { rows: ExhibitorRecord[]; performance: ExhibitorPerformanceRow[] }) {
  const performanceById = new Map(performance.map((item) => [item.id, item]))
  return (
    <ExpoDataTable
      title="Exhibitors"
      description="Companies assigned to this expo with activation and payment performance."
      rows={rows}
      empty="No exhibitors assigned to this expo yet."
      searchText={(item) => `${safeDisplay(item.company)} ${safeDisplay(item.email)} ${safeDisplay(item.contact)} ${item.status}`}
      statusAccessor={(item) => item.status}
      exportFileName="expo-exhibitors.csv"
      columns={[
        { header: "Company", render: (item) => <EntityText primary={safeDisplay(item.company)} secondary={safeDisplay(item.email)} />, exportValue: (item) => safeDisplay(item.company) },
        { header: "Contact", render: (item) => safeDisplay(item.contact), exportValue: (item) => safeDisplay(item.contact) },
        { header: "Status", render: (item) => <StatusBadge value={item.status.replaceAll("_", " ")} />, exportValue: (item) => item.status },
        { header: "Revenue", render: (item) => formatCurrency(performanceById.get(item.id)?.revenue || 0, performanceById.get(item.id)?.currency || "KES"), exportValue: (item) => performanceById.get(item.id)?.revenue || 0 },
        { header: "Score", render: (item) => String(performanceById.get(item.id)?.score || 0), exportValue: (item) => performanceById.get(item.id)?.score || 0 },
        { header: "Assigned", render: (item) => formatDate(item.createdAt), exportValue: (item) => item.createdAt }
      ]}
    />
  )
}

function VisitorsTable({ rows, expo }: { rows: VisitorRecord[]; expo: ExpoRecord }) {
  return (
    <ExpoDataTable
      title="Visitors"
      description="Visitors who engaged this expo, with interaction count and latest activity."
      rows={rows}
      empty="No visitor activity recorded for this expo yet."
      searchText={(item) => `${safeDisplay(item.name)} ${safeDisplay(item.email)} ${item.status}`}
      statusAccessor={(item) => item.status}
      exportFileName="expo-visitors.csv"
      columns={[
        { header: "Visitor", render: (item) => <EntityText primary={safeDisplay(item.name)} secondary={safeDisplay(item.email)} />, exportValue: (item) => safeDisplay(item.name) },
        { header: "Status", render: (item) => <StatusBadge value={item.status} />, exportValue: (item) => item.status },
        { header: "Interactions", render: (item) => String(expoVisit(item, expo)?.interactions || item.interactions || 0), exportValue: (item) => expoVisit(item, expo)?.interactions || item.interactions || 0 },
        { header: "Last Visit", render: (item) => formatDate(expoVisit(item, expo)?.lastActivity || item.lastActivity), exportValue: (item) => expoVisit(item, expo)?.lastActivity || item.lastActivity }
      ]}
    />
  )
}

function PaymentsTable({ rows, expo }: { rows: PaymentRecord[]; expo: ExpoRecord }) {
  return (
    <ExpoDataTable
      title="Payments"
      description="Activation and add-on payments connected to this expo."
      rows={rows}
      empty="No payments recorded for this expo yet."
      searchText={(item) => `${item.reference} ${safeDisplay(item.payerName)} ${item.status} ${item.method}`}
      statusAccessor={(item) => item.status}
      exportFileName="expo-payments.csv"
      columns={[
        { header: "Reference", render: (item) => <span className="font-semibold text-foreground">{item.reference}</span>, exportValue: (item) => item.reference },
        { header: "Payer", render: (item) => safeDisplay(item.payerName), exportValue: (item) => safeDisplay(item.payerName) },
        { header: "Amount", render: (item) => formatCurrency(item.amount, item.currency || expo.currency), exportValue: (item) => item.amount },
        { header: "Method", render: (item) => item.method, exportValue: (item) => item.method },
        { header: "Status", render: (item) => <StatusBadge value={item.status} />, exportValue: (item) => item.status },
        { header: "Paid", render: (item) => formatDate(item.paidAt), exportValue: (item) => item.paidAt }
      ]}
    />
  )
}

function FeedbackTable({ rows }: { rows: OrganizerFeedback[] }) {
  return (
    <ExpoDataTable
      title="Feedback"
      description="Full exhibitor feedback submitted for this expo."
      rows={rows}
      empty="No exhibitor feedback submitted for this expo yet."
      searchText={(item) => `${safeDisplay(item.respondentName)} ${item.category} ${item.comment} ${item.improvements || ""} ${item.dislikes || ""}`}
      statusAccessor={(item) => item.category}
      exportFileName="expo-feedback.csv"
      columns={[
        { header: "Exhibitor", render: (item) => safeDisplay(item.respondentName), exportValue: (item) => safeDisplay(item.respondentName) },
        { header: "Rating", render: (item) => `${item.rating}/5`, exportValue: (item) => item.rating },
        { header: "Category", render: (item) => <StatusBadge value={item.category} />, exportValue: (item) => item.category },
        { header: "Comment", render: (item) => <span className="line-clamp-2 max-w-md text-slate-600">{item.comment || "No comment"}</span>, exportValue: (item) => item.comment || "" },
        { header: "Improvements", render: (item) => <span className="line-clamp-2 max-w-md text-slate-600">{item.improvements || item.suggestions || "Not provided"}</span>, exportValue: (item) => item.improvements || item.suggestions || "" },
        { header: "Submitted", render: (item) => formatDate(item.createdAt), exportValue: (item) => item.createdAt }
      ]}
    />
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

type DailyReportRow = {
  key: string
  label: string
  payments: number
  revenue: number
  visitors: number
  interactions: number
  feedback: number
}

type ExhibitorPerformanceRow = {
  id: string
  company: string
  status: string
  revenue: number
  payments: number
  score: number
  currency: string
}

type ExpoColumn<T> = {
  header: string
  render: (row: T) => ReactNode
  exportValue: (row: T) => string | number
}

function ExpoDataTable<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  empty,
  searchText,
  statusAccessor,
  exportFileName
}: {
  title: string
  description: string
  rows: T[]
  columns: ExpoColumn<T>[]
  empty: string
  searchText: (row: T) => string
  statusAccessor?: (row: T) => string
  exportFileName: string
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 8
  const statuses = Array.from(new Set(rows.map((row) => statusAccessor?.(row)).filter(Boolean) as string[])).sort()
  const filteredRows = rows.filter((row) => {
    const matchesSearch = searchText(row).toLowerCase().includes(query.toLowerCase())
    const matchesStatus = status === "all" || !statusAccessor || statusAccessor(row) === status
    return matchesSearch && matchesStatus
  })
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  function exportCsv() {
    const csvRows = filteredRows.map((row) => columns.map((column) => `"${String(column.exportValue(row) ?? "").replaceAll('"', '""')}"`).join(","))
    const csv = [columns.map((column) => column.header).join(","), ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = exportFileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="overflow-hidden border-border/70 shadow-card">
      <div className="border-b border-border/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">{title}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{description}</h3>
          </div>
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="h-10 w-full rounded-xl border border-border/70 bg-elevated px-3.5 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            {statuses.length ? (
              <select
                value={status}
                onChange={(event) => { setStatus(event.target.value); setPage(1) }}
                className="h-10 rounded-xl border border-border/70 bg-elevated px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All filters</option>
                {statuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
              </select>
            ) : null}
            <span className="rounded-xl border border-border/70 bg-elevated px-3 py-2 text-sm font-semibold text-foreground">{filteredRows.length} records</span>
          </div>
        </div>
      </div>
      {!visibleRows.length ? (
        <div className="p-8 text-center text-sm text-slate-500">{empty}</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-elevated text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>{columns.map((column) => <th key={column.header} className="px-4 py-3">{column.header}</th>)}</tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    {columns.map((column) => <td key={column.header} className="px-4 py-3 align-top text-slate-600">{column.render(row)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {visibleRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-border/70 bg-elevated/60 p-4">
                {columns.slice(0, 4).map((column) => (
                  <div key={column.header} className="border-b border-border/60 py-2 last:border-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{column.header}</p>
                    <div className="mt-1 text-sm text-foreground">{column.render(row)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex items-center justify-between border-t border-border/70 px-5 py-4">
        <p className="text-sm text-slate-500">Page {safePage} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
        </div>
      </div>
    </Card>
  )
}

function EntityText({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div>
      <p className="font-semibold text-foreground">{primary}</p>
      {secondary ? <p className="mt-1 text-xs text-slate-500">{secondary}</p> : null}
    </div>
  )
}

function BestExhibitorsPanel({ rows }: { rows: ExhibitorPerformanceRow[] }) {
  const topRows = rows.slice(0, 5)
  return (
    <Card className="p-5 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Best Exhibitors</p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Top workspace performance</h3>
      <div className="mt-5 space-y-3">
        {!topRows.length ? <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-slate-500">No exhibitor performance yet.</p> : null}
        {topRows.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-border/70 bg-elevated/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{index + 1}. {item.company}</p>
                <p className="mt-1 text-xs text-slate-500">{item.status.replaceAll("_", " ")} · {item.payments} payment(s)</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-primary">{item.score}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
              <div className="h-full rounded-full" style={{ width: `${Math.max(6, Math.min(100, item.score))}%`, backgroundColor: chartPalette[index % chartPalette.length] }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{formatCurrency(item.revenue, item.currency)}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DailyReportChart({ rows, currency }: { rows: DailyReportRow[]; currency: string }) {
  const max = Math.max(1, ...rows.map((item) => item.revenue + item.interactions + item.visitors + item.feedback))
  return (
    <div className="space-y-4">
      {!rows.length ? <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-slate-500">No daily activity yet.</div> : null}
      {rows.map((item, index) => {
        const total = item.revenue + item.interactions + item.visitors + item.feedback
        const width = Math.max(5, Math.round((total / max) * 100))
        return (
          <div key={item.key} className="rounded-2xl border border-border/70 bg-elevated/55 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.visitors} visitors · {item.interactions} interactions · {item.feedback} feedback</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(item.revenue, currency)}</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-card">
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: chartPalette[index % chartPalette.length] }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function expoVisit(visitor: VisitorRecord, expo: ExpoRecord) {
  return (visitor.visitedExpos || []).find((visited) => visited.id === expo.id || visited.name === expo.name)
}

function buildDailyReport(expo: ExpoRecord, payments: PaymentRecord[], visitors: VisitorRecord[], feedback: OrganizerFeedback[]): DailyReportRow[] {
  const start = parseDate(expo.startDate)
  const end = parseDate(expo.endDate)
  const days: DailyReportRow[] = []
  if (!start || !end || start > end) return days
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const key = dateKey(day.toISOString())
    days.push({ key, label: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), payments: 0, revenue: 0, visitors: 0, interactions: 0, feedback: 0 })
  }
  const byKey = new Map(days.map((day) => [day.key, day]))
  payments.forEach((payment) => {
    const row = byKey.get(dateKey(payment.paidAt))
    if (!row) return
    row.payments += 1
    if (payment.status === "paid") row.revenue += payment.amount
  })
  visitors.forEach((visitor) => {
    const visit = expoVisit(visitor, expo)
    const row = byKey.get(dateKey(visit?.lastActivity || visitor.lastActivity))
    if (!row) return
    row.visitors += 1
    row.interactions += visit?.interactions || visitor.interactions || 0
  })
  feedback.forEach((item) => {
    const row = byKey.get(dateKey(item.createdAt))
    if (row) row.feedback += 1
  })
  return days
}

function buildExhibitorPerformance(exhibitors: ExhibitorRecord[], payments: PaymentRecord[]): ExhibitorPerformanceRow[] {
  return exhibitors.map((exhibitor) => {
    const company = safeDisplay(exhibitor.company)
    const matchedPayments = payments.filter((payment) => safeDisplay(payment.payerName).toLowerCase().includes(company.toLowerCase()) || company.toLowerCase().includes(safeDisplay(payment.payerName).toLowerCase()))
    const paid = matchedPayments.filter((payment) => payment.status === "paid")
    const revenue = paid.reduce((sum, payment) => sum + payment.amount, 0)
    const score = Math.round((exhibitor.status === "active" ? 35 : 8) + paid.length * 15 + Math.min(50, revenue / 1000))
    return { id: exhibitor.id, company, status: exhibitor.status, revenue, payments: matchedPayments.length, score, currency: paid[0]?.currency || "KES" }
  }).sort((a, b) => b.score - a.score)
}

function parseDate(value?: string) {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime()) ? date : null
}

function dateKey(value?: string) {
  const date = parseDate(value)
  return date ? date.toISOString().slice(0, 10) : ""
}
