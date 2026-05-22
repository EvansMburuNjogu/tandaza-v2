"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DetailCard } from "@/components/admin/detail-card"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { StatusBadge } from "@/components/admin/status-badge"
import { useSessionStore } from "@/store/session-store"
import { getSponsorDetailView } from "@/lib/admin-entities"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function SponsorDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["sponsor-detail", params.id], queryFn: () => getSponsorDetailView(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (!query.data) return <ErrorState title="Sponsor not found" message="This sponsor record does not exist in the current dataset." />

  const { sponsor, payments, ads, engagements } = query.data
  const totalPayments = payments.reduce((sum, item) => sum + item.amount, 0)
  const baseCurrency = payments[0]?.currency || "KES"
  const totalImpressions = ads.reduce((sum, item) => sum + item.impressions, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Sponsor Details" description="Inspect sponsor payments, ads, and engagement output from an admin perspective." actions={<Link href={`/administrator/sponsors/${sponsor.id}/edit`} className="inline-flex items-center rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-card">Edit Sponsor</Link>} />
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Payments" value={formatCurrency(totalPayments, baseCurrency)} />
        <SummaryCard label="Ad Campaigns" value={String(ads.length)} />
        <SummaryCard label="Clicks" value={String(engagements)} />
        <SummaryCard label="Impressions" value={String(totalImpressions)} />
      </div>
      <DetailCard title={sponsor.company} actions={<BackLink href="/administrator/sponsors" label="Back" />} items={[
        { label: "Sponsor Name", value: sponsor.sponsor },
        { label: "Email", value: sponsor.email },
        { label: "Package", value: sponsor.package },
        { label: "Campaign Status", value: <StatusBadge value={sponsor.campaignStatus} /> },
        { label: "Created", value: formatDate(sponsor.createdAt) }
      ]} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><SectionTitle title="Payments" description="Payments made by this sponsor across sponsored expos." /><div className="mt-4 space-y-3">{payments.map((item) => <RowItem key={item.id} title={item.reference} subtitle={`${item.expoName} · ${item.method}`} trailing={<span className="text-sm font-semibold text-foreground">{formatCurrency(item.amount, item.currency)}</span>} />)}</div></Card>
        <Card className="p-6"><SectionTitle title="Ads & Engagement" description="Campaigns created by this sponsor and their performance." /><div className="mt-4 space-y-3">{ads.map((item) => <RowItem key={item.id} title={item.campaignName} subtitle={`${item.placement} · ${item.impressions} impressions`} trailing={<StatusBadge value={item.status} />} />)}</div></Card>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) { return <Card className="p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p></Card> }
function SectionTitle({ title, description }: { title: string; description: string }) { return <div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p><p className="mt-2 text-sm text-slate-500">{description}</p></div> }
function RowItem({ title, subtitle, trailing }: { title: string; subtitle: string; trailing: ReactNode }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-elevated/60 p-4"><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div>{trailing}</div></div> }
