"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { BackLink } from "@/components/ui/back-link"
import { DetailCard } from "@/components/admin/detail-card"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { formatCurrency } from "@/lib/utils"

export default function SponsorPlanDetailPage() {
  const params = useParams<{ id: string }>()
  const token = useSessionStore((s) => s.token)
  const query = useQuery({ queryKey: ["admin-sponsor-plan", params.id], queryFn: () => api.getAdminSponsorPlan(token || "", params.id), enabled: Boolean(token && params.id) })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const plan = query.data
  return (
    <div className="space-y-6">
      <PageHeader title="Sponsor Plan Details" description="Inspect sponsor plan pricing, package tier, and commission." actions={<Link href={`/administrator/sponsor-plans/${plan.id}/edit`} className="inline-flex items-center rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-card">Edit Plan</Link>} />
      <DetailCard title={plan.name} actions={<BackLink href="/administrator/sponsor-plans" label="Back" />} items={[
        { label: "Tier", value: plan.tier },
        { label: "Price", value: formatCurrency(plan.price, plan.currency) },
        { label: "Billing Cycle", value: plan.billingCycle },
        { label: "Commission", value: `${plan.organizerCommissionPercent}%` },
        { label: "Status", value: plan.status },
        { label: "Description", value: plan.description || "No description" }
      ]} />
    </div>
  )
}
