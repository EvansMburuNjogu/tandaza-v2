"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DetailCard } from "@/components/admin/detail-card"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { BackLink } from "@/components/ui/back-link"
import { StatusBadge } from "@/components/admin/status-badge"
import { useSessionStore } from "@/store/session-store"
import { getSettlementDetailView } from "@/lib/admin-entities"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function SettlementDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["settlement-detail", params.id], queryFn: () => getSettlementDetailView(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Settlement not found" message="This settlement record does not exist in the current dataset." />

  const { settlement, exhibitorPayments, paidExhibitorCount, collected } = query.data
  const platformRetained = collected - settlement.commission
  const payoutMethod = settlement.payoutMethod ? settlement.payoutMethod.replaceAll("_", " ") : "Not configured"

  return (
    <div className="space-y-6">
      <PageHeader title="Settlement Detail" description="Inspect paid exhibitors, commission values, and the full summary breakdown for this settlement." actions={<BackLink href="/administrator/settlements" label="Back" />} />
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Paid Exhibitors" value={String(paidExhibitorCount)} />
        <SummaryCard label="Collected" value={formatCurrency(collected, settlement.currency)} />
        <SummaryCard label="Organizer Payout" value={formatCurrency(settlement.commission, settlement.currency)} />
        <SummaryCard label="Platform Retained" value={formatCurrency(platformRetained, settlement.currency)} />
      </div>
      <DetailCard title={settlement.reference} items={[
        { label: "Expo", value: settlement.expo },
        { label: "Organizer", value: settlement.organizer },
        { label: "Currency", value: settlement.currency },
        { label: "Amount", value: formatCurrency(settlement.amount, settlement.currency) },
        { label: "Organizer Commission", value: formatCurrency(settlement.commission, settlement.currency) },
        { label: "Payout Method", value: payoutMethod },
        { label: "Account Name", value: settlement.accountName || "Not configured" },
        { label: "Payout Account", value: payoutAccountLabel(settlement) },
        { label: "Status", value: <StatusBadge value={settlement.status} /> },
        { label: "Created", value: formatDate(settlement.createdAt) }
      ]} />
      <Card className="p-6">
        <SectionTitle title="Paid Exhibitors" description="Exhibitor payments captured for this expo and contributing to this settlement." />
        <div className="mt-4 space-y-3">
          {exhibitorPayments.map((payment) => (
            <RowItem key={payment.id} title={payment.payerName} subtitle={`${payment.reference} · ${payment.method}`} trailing={<span className="text-sm font-semibold text-foreground">{formatCurrency(payment.amount, payment.currency)}</span>} />
          ))}
        </div>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p></Card> }
function SectionTitle({ title, description }: { title: string; description: string }) { return <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p><p className="mt-2 text-sm text-slate-500">{description}</p></div> }
function RowItem({ title, subtitle, trailing }: { title: string; subtitle: string; trailing: ReactNode }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-elevated/60 p-4"><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div>{trailing}</div></div> }
function payoutAccountLabel(settlement: { payoutMethod?: string; bankName?: string; accountNumber?: string; mobileProvider?: string; mobileNumber?: string }) {
  if (settlement.payoutMethod === "bank") return [settlement.bankName, settlement.accountNumber].filter(Boolean).join(" · ") || "Not configured"
  if (settlement.payoutMethod === "mobile_money") return [settlement.mobileProvider, settlement.mobileNumber].filter(Boolean).join(" · ") || "Not configured"
  return "Manual settlement"
}
