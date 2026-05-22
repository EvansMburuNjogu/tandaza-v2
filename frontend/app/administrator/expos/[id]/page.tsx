"use client"

import Link from "next/link"
import { ReactNode, useState } from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { BackLink } from "@/components/ui/back-link"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { StatusBadge } from "@/components/admin/status-badge"
import { api } from "@/lib/api"
import { AdRecord, ExhibitorRecord, ExpoStatus, PaymentRecord, VisitorRecord } from "@/lib/api/contracts"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"

type ExpoDetailTab = "details" | "exhibitors" | "visitors" | "payments" | "analytics" | "ads"
const pageSize = 8

export default function ExpoDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const client = useQueryClient()
  const [activeTab, setActiveTab] = useState<ExpoDetailTab>("details")
  const query = useQuery({ queryKey: ["admin-expo", params.id], queryFn: () => api.getAdminExpo(token || "", params.id), enabled: Boolean(token && params.id) })
  const exhibitors = useQuery({ queryKey: ["admin-expo-exhibitors", params.id], queryFn: () => api.getAdminExpoExhibitors(token || "", params.id), enabled: Boolean(token && params.id) })
  const visitors = useQuery({ queryKey: ["admin-expo-visitors", params.id], queryFn: () => api.getAdminExpoVisitors(token || "", params.id), enabled: Boolean(token && params.id) })
  const payments = useQuery({ queryKey: ["admin-expo-payments", params.id], queryFn: () => api.getAdminExpoPayments(token || "", params.id), enabled: Boolean(token && params.id) })
  const analytics = useQuery({ queryKey: ["admin-expo-analytics", params.id], queryFn: () => api.getAdminExpoAnalytics(token || "", params.id), enabled: Boolean(token && params.id) })
  const ads = useQuery({ queryKey: ["admin-expo-ads", params.id], queryFn: () => api.getAdminExpoAds(token || "", params.id), enabled: Boolean(token && params.id) })
  const statusMutation = useMutation({
    mutationFn: (status: ExpoStatus) => api.updateAdminExpoStatus(token || "", params.id, status),
    onSuccess: () => {
      toast.success("Expo status updated")
      client.invalidateQueries({ queryKey: ["admin-expo", params.id] })
      client.invalidateQueries({ queryKey: ["admin-expo-analytics", params.id] })
      client.invalidateQueries({ queryKey: ["admin-expos"] })
    }
  })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Expo not found" message="This expo record does not exist." />

  const expo = query.data
  const coverImage = expo.coverImageUrl || expo.coverImage
  const tabs: Array<{ id: ExpoDetailTab; label: string; count?: number }> = [
    { id: "details", label: "Expo Details" },
    { id: "exhibitors", label: "Exhibitors", count: exhibitors.data?.items.length },
    { id: "visitors", label: "Visitors", count: visitors.data?.items.length },
    { id: "payments", label: "Payments Made", count: payments.data?.items.length },
    { id: "analytics", label: "Analytics" },
    { id: "ads", label: "Ads", count: ads.data?.items.length }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expo Details"
        description="Review expo lifecycle, country, pricing, categories, and organizer commission."
        actions={<Link href={`/administrator/expos/${expo.id}/edit`} className="inline-flex items-center rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-card">Update Expo</Link>}
      />

      <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-card">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <div className="relative min-h-52 bg-elevated">
            {coverImage ? (
              <img src={coverImage} alt={`${expo.name} cover`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-52 items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--accent)/0.08))] text-sm font-semibold text-primary">
                Expo cover image
              </div>
            )}
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={expo.status.replaceAll("_", " ")} />
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-slate-600">{expo.countryCode || "KE"}</span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-slate-600">{expo.currency}</span>
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{expo.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{expo.description || "No description has been added for this expo."}</p>
              </div>
              <BackLink href="/administrator/expos" label="Back" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Exhibitors" value={exhibitors.data?.items.length ?? 0} />
              <Metric label="Visitors" value={visitors.data?.items.length ?? 0} />
              <Metric label="Payments" value={payments.data?.items.length ?? 0} />
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur">
        <div className="flex min-w-max gap-2 rounded-2xl border border-border/70 bg-elevated/70 p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-card text-primary shadow-sm"
                  : "text-slate-500 hover:bg-card/60 hover:text-foreground"
              }`}
            >
              {tab.label}
              {typeof tab.count === "number" && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-secondary text-slate-600"}`}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <LifecycleControl currentStatus={expo.status} isPending={statusMutation.isPending} onChange={(status) => statusMutation.mutate(status)} />

      {activeTab === "details" && (
        <TabPanel title="Expo Details" description="Core operating details for this expo.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Location" value={expo.location} />
            <InfoTile label="Dates" value={expo.dates} />
            <InfoTile label="Organizer" value={expo.organizer} />
            <InfoTile label="Timezone" value={expo.timezone || "Africa/Nairobi"} />
            <InfoTile label="Activation Fee" value={formatCurrency(expo.exhibitorFee, expo.currency)} />
            <InfoTile label="Ads Add-on Fee" value={formatCurrency(expo.adsAddonFee || 0, expo.currency)} />
            <InfoTile label="Commission" value={`${expo.organizerCommissionRate || 0}%`} />
            <InfoTile label="Currency" value={expo.currency} />
            <InfoTile label="Categories" value={expo.categories?.map((category) => category.name).join(", ") || "None"} />
          </div>
        </TabPanel>
      )}

      {activeTab === "exhibitors" && (
        <TabPanel title="Exhibitors" description="Assigned exhibitors and activation state for this expo.">
        <DataTable
          loading={exhibitors.isLoading}
          emptyTitle="No exhibitors assigned"
          rows={exhibitors.data?.items || []}
          columns={[
            { header: "Company", render: (row: ExhibitorRecord) => <Entity primary={row.company} secondary={row.email} /> },
            { header: "Status", render: (row: ExhibitorRecord) => <StatusBadge value={row.status.replaceAll("_", " ")} /> },
            { header: "Assigned", render: (row: ExhibitorRecord) => formatDate(row.createdAt) }
          ]}
        />
        </TabPanel>
      )}

      {activeTab === "visitors" && (
        <TabPanel title="Visitors" description="Visitor leads captured from QR scans, workspace actions, meeting requests, and remote access.">
        <DataTable
          loading={visitors.isLoading}
          emptyTitle="No visitor activity yet"
          rows={visitors.data?.items || []}
          columns={[
            { header: "Visitor", render: (row: VisitorRecord) => <Entity primary={row.name} secondary={row.email} /> },
            { header: "Interactions", render: (row: VisitorRecord) => row.interactions },
            { header: "Expos", render: (row: VisitorRecord) => row.exposAttended },
            { header: "Last Activity", render: (row: VisitorRecord) => row.lastActivity ? formatDate(row.lastActivity) : "Not recorded" }
          ]}
        />
        </TabPanel>
      )}

      {activeTab === "payments" && (
        <TabPanel title="Payments Made" description="Activation and sponsorship payment activity tied to this expo.">
        <DataTable
          loading={payments.isLoading}
          emptyTitle="No payments recorded"
          rows={payments.data?.items || []}
          columns={[
            { header: "Reference", render: (row: PaymentRecord) => <Entity primary={row.reference || row.id} secondary={row.payerName} /> },
            { header: "Payer", render: (row: PaymentRecord) => <span className="capitalize">{row.payerRole}</span> },
            { header: "Amount", render: (row: PaymentRecord) => formatCurrency(row.amount, row.currency) },
            { header: "Method", render: (row: PaymentRecord) => row.method },
            { header: "Status", render: (row: PaymentRecord) => <StatusBadge value={row.status} /> },
            { header: "Paid At", render: (row: PaymentRecord) => row.paidAt ? formatDate(row.paidAt) : "Not paid" }
          ]}
        />
        </TabPanel>
      )}

      {activeTab === "analytics" && (
        <TabPanel title="Analytics" description="Live operational signals from exhibitor activation and visitor engagement.">
        {analytics.isLoading ? <Spinner className="h-6 w-6 text-primary" /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(analytics.data?.stats || []).map((stat) => (
              <div key={stat.id} className="rounded-2xl border border-border/70 bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
                <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.delta}</p>
              </div>
            ))}
          </div>
        )}
        </TabPanel>
      )}

      {activeTab === "ads" && (
        <TabPanel title="Ads" description="Sponsor and exhibitor ad placements connected to this expo country.">
        <DataTable
          loading={ads.isLoading}
          emptyTitle="No ads found"
          rows={ads.data?.items || []}
          columns={[
            { header: "Campaign", render: (row: AdRecord) => <Entity primary={row.campaignName || row.name || "Ad campaign"} secondary={row.ownerName} /> },
            { header: "Placement", render: (row: AdRecord) => row.placement },
            { header: "Performance", render: (row: AdRecord) => `${row.impressions.toLocaleString()} impressions / ${row.clicks.toLocaleString()} clicks` },
            { header: "Status", render: (row: AdRecord) => <StatusBadge value={row.status} /> }
          ]}
        />
        </TabPanel>
      )}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-elevated/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function LifecycleControl({ currentStatus, isPending, onChange }: { currentStatus: ExpoStatus; isPending: boolean; onChange: (status: ExpoStatus) => void }) {
  const actions = lifecycleActionsFor(currentStatus)
  const primaryActions = actions.filter((action) => action.status !== "archived")
  const archiveAction = actions.find((action) => action.status === "archived")

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/85 p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-10 w-1 rounded-full bg-primary" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Lifecycle Control</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Current state</span>
              <StatusBadge value={currentStatus.replaceAll("_", " ")} />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{lifecycleHint(currentStatus)}</p>
          </div>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {primaryActions.map((action, index) => (
              <Button key={action.status} type="button" size="sm" variant={index === 0 ? "primary" : "secondary"} onClick={() => onChange(action.status)} disabled={isPending}>
                {action.label}
              </Button>
            ))}
            {archiveAction && (
              <Button type="button" size="sm" variant="danger" onClick={() => window.confirm("Archive this expo?") && onChange("archived")} disabled={isPending}>
                Archive
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-elevated px-4 py-3 text-sm font-medium text-slate-500">No lifecycle actions available.</div>
        )}
      </div>
    </div>
  )
}

function lifecycleActionsFor(status: ExpoStatus): Array<{ status: ExpoStatus; label: string }> {
  switch (status) {
    case "draft":
      return [{ status: "approved", label: "Approve" }, { status: "needs_changes", label: "Request Changes" }, { status: "archived", label: "Archive" }]
    case "submitted_for_review":
      return [{ status: "approved", label: "Approve" }, { status: "needs_changes", label: "Request Changes" }, { status: "archived", label: "Archive" }]
    case "needs_changes":
      return [{ status: "approved", label: "Approve" }, { status: "archived", label: "Archive" }]
    case "approved":
      return [{ status: "published", label: "Publish" }, { status: "needs_changes", label: "Request Changes" }, { status: "archived", label: "Archive" }]
    case "published":
      return [{ status: "live", label: "Mark Live" }, { status: "archived", label: "Archive" }]
    case "live":
      return [{ status: "completed", label: "Complete Expo" }, { status: "archived", label: "Archive" }]
    case "completed":
    case "settlement_pending":
    case "settled":
      return [{ status: "archived", label: "Archive" }]
    default:
      return []
  }
}

function lifecycleHint(status: ExpoStatus) {
  switch (status) {
    case "draft":
      return "This expo is still being prepared. Approve it when the core details, dates, pricing, and organizer assignment are ready."
    case "submitted_for_review":
      return "The organizer has submitted this expo. Approve it, request changes, or archive it if it should not proceed."
    case "needs_changes":
      return "The expo needs organizer updates before it can move forward. Approve it once the requested changes are complete."
    case "approved":
      return "The expo is approved internally. Publish it when visitors and exhibitors should start seeing it."
    case "published":
      return "The expo is visible. Mark it live when the expo is actively running."
    case "live":
      return "The expo is live. Complete it once the expo has ended and post-expo follow-up can begin."
    case "completed":
      return "The expo is complete. Archive it when reporting and operational review are done."
    case "archived":
      return "This expo is archived and no longer active in normal operations."
    default:
      return "Manage the current lifecycle state for this expo."
  }
}

function TabPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Workspace</p>
          <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Entity({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{primary}</p>
      {secondary && <p className="mt-0.5 text-xs text-slate-500">{secondary}</p>}
    </div>
  )
}

function DataTable<T>({ loading, rows, columns, emptyTitle }: { loading: boolean; rows: T[]; emptyTitle: string; columns: Array<{ header: string; render: (row: T) => ReactNode }> }) {
  const [page, setPage] = useState(1)
  if (loading) return <Spinner className="h-6 w-6 text-primary" />
  if (rows.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-elevated/60 p-8 text-center text-sm font-medium text-slate-500">{emptyTitle}</div>
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
              {visibleRows.map((row, index) => (
                <tr key={index} className="transition hover:bg-elevated/50">
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
