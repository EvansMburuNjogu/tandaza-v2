"use client"

import Link from "next/link"
import { ReactNode, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { BackLink } from "@/components/ui/back-link"
import { StatusBadge } from "@/components/admin/status-badge"
import { useSessionStore } from "@/store/session-store"
import { getExhibitorDetailView } from "@/lib/admin-entities"
import { AdRecord, ExpoRecord, PaymentRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate } from "@/lib/utils"

type ExhibitorTab = "profile" | "expos" | "analytics" | "payments" | "ads"
const pageSize = 8

export default function ExhibitorDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const [activeTab, setActiveTab] = useState<ExhibitorTab>("profile")
  const query = useQuery({ queryKey: ["exhibitor-detail", params.id], queryFn: () => getExhibitorDetailView(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Exhibitor not found" message="This exhibitor record does not exist in the current dataset." />

  const { exhibitor, expos, assignments, payments, ads, analytics } = query.data
  const paidPayments = payments.filter((item) => item.status === "paid")
  const baseCurrency = paidPayments[0]?.currency || expos[0]?.currency || "KES"
  const paidTotal = paidPayments.reduce((sum, item) => sum + item.amount, 0)
  const adClicks = ads.reduce((sum, item) => sum + item.clicks, 0)
  const adImpressions = ads.reduce((sum, item) => sum + item.impressions, 0)
  const totalPaymentRecords = analytics.reduce((sum, row) => sum + row.paymentCount, 0)
  const averagePaidPerExpo = analytics.length ? Math.round(paidTotal / analytics.length) : 0
  const allExpoCtr = adImpressions ? Number(((adClicks / adImpressions) * 100).toFixed(1)) : 0
  const activeAssignments = assignments.filter((item) => item.status === "active").length
  const activationRate = assignments.length ? Math.round((activeAssignments / assignments.length) * 100) : 0
  const topExpoByRevenue = [...analytics].sort((a, b) => b.paidTotal - a.paidTotal)[0]
  const topExpoByReach = [...analytics].sort((a, b) => b.impressions - a.impressions)[0]
  const maxAnalyticsRevenue = Math.max(...analytics.map((row) => row.paidTotal), 1)
  const maxAnalyticsReach = Math.max(...analytics.map((row) => row.impressions), 1)
  const tabs: Array<{ id: ExhibitorTab; label: string; count?: number }> = [
    { id: "profile", label: "Company Profile" },
    { id: "expos", label: "Expos", count: expos.length },
    { id: "analytics", label: "Reports & Analytics", count: analytics.length },
    { id: "payments", label: "Payments", count: payments.length },
    { id: "ads", label: "Ads", count: ads.length }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exhibitor View"
        description="Review this exhibitor’s company profile, expo assignments, payments, ads, and per-expo performance."
        actions={<BackLink href="/administrator/exhibitors" label="Back" />}
      />

      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-card">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="relative p-5 sm:p-6 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--elevated)))]" />
            <div className="relative">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-card">
                    {initials(exhibitor.company)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={exhibitor.status.replaceAll("_", " ")} />
                      <span className="rounded-full bg-card/75 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-border/70">{assignments.length} assigned expo{assignments.length === 1 ? "" : "s"}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{exhibitor.company}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{exhibitor.contact} manages this exhibitor account and its activity across assigned expos.</p>
                  </div>
                </div>
                <Link
                  href={`/administrator/exhibitors/${exhibitor.id}/edit`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary/95"
                >
                  Update Profile
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Assigned Expos" value={expos.length} helper={`${assignments.filter((item) => item.status === "active").length} active`} />
                <Metric label="Paid Total" value={formatCurrency(paidTotal, baseCurrency)} helper={`${paidPayments.length} paid records`} />
                <Metric label="Ad Clicks" value={adClicks.toLocaleString()} helper={`${adImpressions.toLocaleString()} impressions`} />
                <Metric label="Open Payments" value={payments.filter((item) => item.status !== "paid").length} helper="pending or failed" />
              </div>
            </div>
          </div>

          <aside className="border-t border-border/70 bg-elevated/55 p-5 sm:p-6 xl:border-l xl:border-t-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Account Snapshot</p>
            <div className="mt-4 space-y-3">
              <InfoRow label="Primary Contact" value={exhibitor.contact} />
              <InfoRow label="Email" value={exhibitor.email} />
              <InfoRow label="Latest Assignment" value={assignments[0]?.assignedExpos || exhibitor.assignedExpos || "No expo assigned"} />
              <InfoRow label="Created" value={exhibitor.createdAt ? formatDate(exhibitor.createdAt) : "Not recorded"} />
            </div>
          </aside>
        </div>
      </section>

      <div className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur">
        <div className="flex min-w-max gap-2 rounded-2xl border border-border/70 bg-elevated/70 p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-card text-primary shadow-sm" : "text-slate-500 hover:bg-card/60 hover:text-foreground"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-secondary text-slate-600"}`}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" && (
        <Panel title="Company Profile" description="Core company identity, account contact, and current platform state.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Company" value={exhibitor.company} />
            <InfoTile label="Primary Contact" value={exhibitor.contact} />
            <InfoTile label="Email" value={exhibitor.email} />
            <InfoTile label="Status" value={exhibitor.status.replaceAll("_", " ")} />
            <InfoTile label="Assigned Expo" value={exhibitor.assignedExpos || "Not assigned"} />
            <InfoTile label="Created" value={exhibitor.createdAt ? formatDate(exhibitor.createdAt) : "Not recorded"} />
          </div>
        </Panel>
      )}

      {activeTab === "expos" && (
        <Panel title="Assigned Expos" description="Expo workspaces this exhibitor can access or activate.">
          <DataTable
            emptyText="No expos are assigned to this exhibitor yet."
            rows={expos}
            columns={[
              { header: "Expo", render: (expo: ExpoRecord) => <Entity title={expo.name} subtitle={expo.location} href={`/administrator/expos/${expo.id}`} /> },
              { header: "Dates", render: (expo: ExpoRecord) => expo.dates },
              { header: "Activation Fee", render: (expo: ExpoRecord) => formatCurrency(expo.exhibitorFee, expo.currency) },
              { header: "Organizer", render: (expo: ExpoRecord) => expo.organizer },
              { header: "Status", render: (expo: ExpoRecord) => <StatusBadge value={expo.status.replaceAll("_", " ")} /> }
            ]}
          />
        </Panel>
      )}

      {activeTab === "analytics" && (
        <Panel title="All-Expo Exhibitor Analytics" description="Aggregated commercial and visibility signals across every expo assigned to this exhibitor.">
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Activation Rate" value={`${activationRate}%`} helper={`${activeAssignments} active of ${assignments.length} assigned`} />
              <Metric label="Paid Revenue" value={formatCurrency(paidTotal, baseCurrency)} helper={`${totalPaymentRecords} payment record${totalPaymentRecords === 1 ? "" : "s"}`} />
              <Metric label="Average Per Expo" value={formatCurrency(averagePaidPerExpo, baseCurrency)} helper={`${analytics.length} expo workspace${analytics.length === 1 ? "" : "s"}`} />
              <Metric label="Ad CTR" value={`${allExpoCtr}%`} helper={`${adClicks.toLocaleString()} clicks from ${adImpressions.toLocaleString()} impressions`} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Revenue by expo</p>
                    <p className="mt-1 text-xs text-slate-500">Paid activation and related payment value per assigned expo</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{formatCurrency(paidTotal, baseCurrency)}</span>
                </div>
                <div className="mt-5 space-y-4">
                  {analytics.length ? analytics.map((row) => (
                    <AnalyticsLine key={row.id} label={row.expo.name} value={formatCurrency(row.paidTotal, row.expo.currency)} ratio={row.paidTotal / maxAnalyticsRevenue} />
                  )) : (
                    <EmptyMiniState text="No expo revenue has been recorded yet." />
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <p className="text-sm font-semibold text-foreground">Top signals</p>
                <p className="mt-1 text-xs text-slate-500">Best performing expo across current records</p>
                <div className="mt-5 space-y-3">
                  <InsightTile label="Top revenue expo" value={topExpoByRevenue?.expo.name || "No revenue yet"} helper={topExpoByRevenue ? formatCurrency(topExpoByRevenue.paidTotal, topExpoByRevenue.expo.currency) : "Waiting for payments"} />
                  <InsightTile label="Top reach expo" value={topExpoByReach?.expo.name || "No reach yet"} helper={topExpoByReach ? `${topExpoByReach.impressions.toLocaleString()} impressions` : "Waiting for ads"} />
                  <InsightTile label="Open payment records" value={String(payments.filter((item) => item.status !== "paid").length)} helper="pending, failed, or cancelled" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Ad reach by expo</p>
                  <p className="mt-1 text-xs text-slate-500">Impressions and clicks aggregated by assigned expo</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-slate-600">{adImpressions.toLocaleString()} impressions</span>
              </div>
              <div className="mt-5 space-y-4">
                {analytics.length ? analytics.map((row) => (
                  <AnalyticsLine key={row.id} label={row.expo.name} value={`${row.impressions.toLocaleString()} impressions / ${row.clicks.toLocaleString()} clicks`} ratio={row.impressions / maxAnalyticsReach} />
                )) : (
                  <EmptyMiniState text="No ad reach has been recorded yet." />
                )}
              </div>
            </div>

            <DataTable
              emptyText="No expo analytics are available for this exhibitor yet."
              rows={analytics}
              columns={[
                { header: "Expo", render: (row) => <Entity title={row.expo.name} subtitle={row.expo.location} href={`/administrator/expos/${row.expo.id}`} /> },
                { header: "Assignment", render: (row) => <StatusBadge value={row.assignmentStatus.replaceAll("_", " ")} /> },
                { header: "Payments", render: (row) => `${row.paymentCount} record${row.paymentCount === 1 ? "" : "s"}` },
                { header: "Paid Total", render: (row) => formatCurrency(row.paidTotal, row.expo.currency) },
                { header: "Ad Reach", render: (row) => `${row.impressions.toLocaleString()} impressions / ${row.clicks.toLocaleString()} clicks` }
              ]}
            />
          </div>
        </Panel>
      )}

      {activeTab === "payments" && (
        <Panel title="Payments" description="Payment records connected to this exhibitor account.">
          <DataTable
            emptyText="No payments are recorded for this exhibitor."
            rows={payments}
            columns={[
              { header: "Reference", render: (payment: PaymentRecord) => <Entity title={payment.reference || payment.id} subtitle={payment.expoName} /> },
              { header: "Amount", render: (payment: PaymentRecord) => formatCurrency(payment.amount, payment.currency) },
              { header: "Method", render: (payment: PaymentRecord) => payment.method },
              { header: "Status", render: (payment: PaymentRecord) => <StatusBadge value={payment.status} /> },
              { header: "Paid At", render: (payment: PaymentRecord) => payment.paidAt ? formatDate(payment.paidAt) : "Not paid" }
            ]}
          />
        </Panel>
      )}

      {activeTab === "ads" && (
        <Panel title="Ads" description="Ad placements owned by this exhibitor.">
          <DataTable
            emptyText="No ads are connected to this exhibitor."
            rows={ads}
            columns={[
              { header: "Campaign", render: (ad: AdRecord) => <Entity title={ad.campaignName || ad.name || "Ad campaign"} subtitle={ad.expoName} /> },
              { header: "Placement", render: (ad: AdRecord) => ad.placement },
              { header: "Performance", render: (ad: AdRecord) => `${ad.impressions.toLocaleString()} impressions / ${ad.clicks.toLocaleString()} clicks` },
              { header: "Status", render: (ad: AdRecord) => <StatusBadge value={ad.status} /> },
              { header: "Created", render: (ad: AdRecord) => formatDate(ad.createdAt) }
            ]}
          />
        </Panel>
      )}
    </div>
  )
}

function Metric({ label, value, helper }: { label: string; value: ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/85 p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold capitalize text-foreground">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function AnalyticsLine({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  const width = Math.max(4, Math.min(100, Math.round((Number.isFinite(ratio) ? ratio : 0) * 100)))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium text-slate-600">{label}</span>
        <span className="shrink-0 font-mono text-slate-500">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function InsightTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-elevated/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

function EmptyMiniState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border/80 p-5 text-center text-sm text-slate-500">{text}</div>
}

function DataTable<T>({ rows, emptyText, columns }: { rows: T[]; emptyText: string; columns: Array<{ header: string; render: (row: T) => ReactNode }> }) {
  const [page, setPage] = useState(1)
  if (rows.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-elevated/50 p-6 text-center text-sm font-medium text-slate-500">{emptyText}</div>
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-elevated">
              <tr>{columns.map((column) => <th key={column.header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{column.header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="transition hover:bg-elevated/50">
                  {columns.map((column) => <td key={column.header} className="px-4 py-4 align-middle text-slate-600">{column.render(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-slate-500">Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, rows.length)} of {rows.length}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage === 1} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-45">Previous</button>
          <span className="rounded-xl bg-elevated px-3 py-2 text-xs font-semibold text-slate-500">Page {safePage} of {totalPages}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage === totalPages} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-45">Next</button>
        </div>
      </div>
    </div>
  )
}

function Entity({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  const content = (
    <>
      <p className="font-semibold text-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
    </>
  )
  if (href) return <Link href={href} className="block transition hover:text-primary">{content}</Link>
  return <div>{content}</div>
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] || "E") + (parts[1]?.[0] || "")
}
