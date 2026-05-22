"use client"

import Link from "next/link"
import { ReactNode, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/admin/page-header"
import { StatusBadge } from "@/components/admin/status-badge"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { useSessionStore } from "@/store/session-store"
import { getOrganizerDetailView } from "@/lib/admin-entities"
import { ExpoRecord, PaymentRecord, SettlementRecord, VisitorRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate } from "@/lib/utils"

type OrganizerTab = "overview" | "expos" | "settlements" | "payments" | "visitors"
const pageSize = 8

export default function OrganizerDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const [activeTab, setActiveTab] = useState<OrganizerTab>("overview")
  const query = useQuery({ queryKey: ["organizer-detail", params.id], queryFn: () => getOrganizerDetailView(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Organizer not found" message="This organizer record does not exist in the current dataset." />

  const { organizer, expos, settlements, payments, visitors } = query.data
  const paidPayments = payments.filter((item) => item.status === "paid")
  const totalCollected = paidPayments.reduce((sum, item) => sum + item.amount, 0)
  const totalCommission = settlements.reduce((sum, item) => sum + item.commission, 0)
  const baseCurrency = payments[0]?.currency || settlements[0]?.currency || "KES"
  const activeExpos = expos.filter((expo) => expo.status === "published" || expo.status === "live").length
  const pendingSettlements = settlements.filter((item) => item.status.includes("pending")).length
  const latestExpo = [...expos].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
  const tabs: Array<{ id: OrganizerTab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "expos", label: "Expos", count: expos.length },
    { id: "settlements", label: "Settlements", count: settlements.length },
    { id: "payments", label: "Payments", count: paidPayments.length },
    { id: "visitors", label: "Visitors", count: visitors.length }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizer View"
        description="A focused view of this organizer’s expo portfolio, revenue, settlements, and operating health."
        actions={<BackLink href="/administrator/organizers" label="Back" />}
      />

      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-card">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="relative p-5 sm:p-6 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--elevated)))]" />
            <div className="relative">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-card">
                    {initials(organizer.company || organizer.name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={organizer.status} />
                      <span className="rounded-full bg-card/75 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-border/70">{organizer.expos} expos</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{organizer.company}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{organizer.name} manages expo operations, audience access, exhibitor activity, and settlement flow for this account.</p>
                  </div>
                </div>
                <Link
                  href={`/administrator/organizers/${organizer.id}/edit`}
                  aria-label={`Update ${organizer.company} organizer profile`}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary/95"
                >
                  Update Profile
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Active Expos" value={activeExpos} helper={`${expos.length} total`} />
                <Metric label="Visitors Reached" value={visitors.length} helper="captured from leads" />
                <Metric label="Paid Inflow" value={formatCurrency(totalCollected, baseCurrency)} helper={`${paidPayments.length} paid records`} />
                <Metric label="Commission" value={formatCurrency(totalCommission, baseCurrency)} helper={`${pendingSettlements} pending`} />
              </div>
            </div>
          </div>

          <aside className="border-t border-border/70 bg-elevated/55 p-5 sm:p-6 xl:border-l xl:border-t-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Account Snapshot</p>
            <div className="mt-4 space-y-3">
              <InfoRow label="Primary Contact" value={organizer.name} />
              <InfoRow label="Email" value={organizer.email} />
              <InfoRow label="Created" value={formatDate(organizer.createdAt)} />
              <InfoRow label="Latest Expo" value={latestExpo?.name || "No expo yet"} />
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

      {activeTab === "overview" && (
        <section className="grid gap-4 md:grid-cols-3">
          <InsightCard title="Operational Focus" value={latestExpo?.status?.replaceAll("_", " ") || "No active portfolio"} description={latestExpo ? `${latestExpo.name} is the latest expo in this organizer account.` : "Create or assign an expo to start measuring organizer performance."} />
          <InsightCard title="Settlement Health" value={pendingSettlements ? `${pendingSettlements} pending` : "Clear"} description={pendingSettlements ? "Review pending settlement records before disbursement." : "No pending settlement review for this organizer."} />
          <InsightCard title="Revenue Quality" value={formatCurrency(totalCollected, baseCurrency)} description="Confirmed paid inflow connected to this organizer’s expos." />
        </section>
      )}

      {activeTab === "expos" && (
        <Panel title="Expo Portfolio" description="Owned expos, lifecycle state, activation fee, and schedule.">
          <PaginatedTable
            rows={expos}
            emptyText="No expos are linked to this organizer yet."
            columns={[
              { header: "Expo", render: (expo: ExpoRecord) => <Entity title={expo.name} subtitle={expo.location} href={`/administrator/expos/${expo.id}`} /> },
              { header: "Dates", render: (expo: ExpoRecord) => expo.dates },
              { header: "Activation Fee", render: (expo: ExpoRecord) => formatCurrency(expo.exhibitorFee, expo.currency) },
              { header: "Exhibitors", render: (expo: ExpoRecord) => expo.exhibitors },
              { header: "Status", render: (expo: ExpoRecord) => <StatusBadge value={expo.status.replaceAll("_", " ")} /> }
            ]}
          />
        </Panel>
      )}

      {activeTab === "settlements" && (
        <Panel title="Settlement Position" description="Commission and payout records for organizer earnings.">
          <PaginatedTable
            rows={settlements}
            emptyText="No settlement records found for this organizer."
            columns={[
              { header: "Reference", render: (settlement: SettlementRecord) => <Entity title={settlement.reference} subtitle={settlement.expo} /> },
              { header: "Amount", render: (settlement: SettlementRecord) => formatCurrency(settlement.amount, settlement.currency) },
              { header: "Commission", render: (settlement: SettlementRecord) => formatCurrency(settlement.commission, settlement.currency) },
              { header: "Created", render: (settlement: SettlementRecord) => formatDate(settlement.createdAt) },
              { header: "Status", render: (settlement: SettlementRecord) => <StatusBadge value={settlement.status} /> }
            ]}
          />
        </Panel>
      )}

      {activeTab === "payments" && (
        <Panel title="Paid Collections" description="Payments collected across expos managed by this organizer.">
          <PaginatedTable
            emptyText="No paid collections yet."
            rows={paidPayments}
            columns={[
              { header: "Reference", render: (payment: PaymentRecord) => <Entity title={payment.reference || payment.id} subtitle={payment.expoName} /> },
              { header: "Payer", render: (payment: PaymentRecord) => payment.payerName },
              { header: "Amount", render: (payment: PaymentRecord) => formatCurrency(payment.amount, payment.currency) },
              { header: "Method", render: (payment: PaymentRecord) => payment.method },
              { header: "Paid At", render: (payment: PaymentRecord) => payment.paidAt ? formatDate(payment.paidAt) : "Not paid" }
            ]}
          />
        </Panel>
      )}

      {activeTab === "visitors" && (
        <Panel title="Visitor Reach" description="Visitors and lead activity associated with this organizer’s expos.">
          <PaginatedTable
            emptyText="No visitor activity has been attributed yet."
            rows={visitors}
            columns={[
              { header: "Visitor", render: (visitor: VisitorRecord) => <Entity title={visitor.name} subtitle={visitor.email} /> },
              { header: "Interactions", render: (visitor: VisitorRecord) => visitor.interactions },
              { header: "Expos", render: (visitor: VisitorRecord) => visitor.exposAttended },
              { header: "Last Activity", render: (visitor: VisitorRecord) => visitor.lastActivity ? formatDate(visitor.lastActivity) : "Not recorded" },
              { header: "Status", render: (visitor: VisitorRecord) => <StatusBadge value={visitor.status} /> }
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

function InsightCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-card p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">{title}</p>
      <p className="mt-3 text-xl font-bold capitalize tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
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

function PaginatedTable<T>({ rows, emptyText, columns }: { rows: T[]; emptyText: string; columns: Array<{ header: string; render: (row: T) => ReactNode }> }) {
  const [page, setPage] = useState(1)
  if (rows.length === 0) return <EmptyState text={emptyText} />
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-elevated">
              <tr>
                {columns.map((column) => (
                  <th key={column.header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{column.header}</th>
                ))}
              </tr>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-elevated/50 p-6 text-center text-sm font-medium text-slate-500">{text}</div>
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] || "O") + (parts[1]?.[0] || "")
}
