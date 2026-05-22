"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { SponsorPlan } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { ErrorState } from "@/components/ui/error-state"
import { cn, formatCurrency } from "@/lib/utils"

export default function SponsorPlansPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-sponsor-plans", selectedCountry],
    queryFn: () => api.getAdminSponsorPlans(token || "", selectedCountry),
    enabled: Boolean(token)
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SponsorPlan["status"] }) => api.updateAdminSponsorPlanStatus(token || "", id, status),
    onSuccess: async () => {
      toast.success("Sponsor plan status updated")
      await query.refetch()
    },
    onError: (error) => toast.error("Could not update sponsor plan", { description: error instanceof Error ? error.message : "Try again." })
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  const plans = query.data
  
  const stats = [
    { id: "total", label: "Total Plans", value: String(plans.length), delta: "Available", trend: "neutral" as const },
    { id: "active", label: "Active", value: String(plans.filter(p => p.status === "active").length), delta: "Published", trend: "up" as const }
  ]

  const tierColors: Record<string, string> = {
    bronze: "bg-orange-100 text-orange-700",
    silver: "bg-slate-100 text-slate-700",
    gold: "bg-amber-100 text-amber-700",
    platinum: "bg-violet-100 text-violet-700"
  }

  return (
    <ResourcePage<SponsorPlan>
      title="Sponsor Plans"
      description="Manage subscription plans for sponsors with tier-based pricing and commission settings."
      actionLabel="Create Plan"
      actionHref="/administrator/sponsor-plans/new"
      stats={stats}
      rows={plans}
      exportFileName="sponsor-plans.csv"
      searchPlaceholder="Search by name or tier…"
      searchText={(r) => `${r.name} ${r.tier} ${r.description}`}
      statusAccessor={(r) => r.status}
      emptyTitle="No plans created"
      emptyDescription="Create your first sponsor subscription plan."
      rowActions={[
        { label: "View plan", onClick: (r) => router.push(`/administrator/sponsor-plans/${r.id}`) },
        { label: "Edit plan", onClick: (r) => router.push(`/administrator/sponsor-plans/${r.id}/edit`) },
        { label: "Activate plan", hidden: (r) => r.status === "active", onClick: (r) => statusMutation.mutate({ id: r.id, status: "active" }) },
        { label: "Deactivate plan", hidden: (r) => r.status !== "active", onClick: (r) => statusMutation.mutate({ id: r.id, status: "inactive" }) },
        { label: "Archive plan", hidden: (r) => r.status === "archived", tone: "danger", onClick: (r) => window.confirm("Archive this sponsor plan?") && statusMutation.mutate({ id: r.id, status: "archived" }) }
      ]}
      columns={[
        {
          key: "name", header: "Plan", sortable: true, sortValue: (r) => r.name,
          render: (r) => (
            <div className="flex items-center gap-3">
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase", tierColors[r.tier])}>
                {r.tier}
              </span>
              <span className="font-medium">{r.name}</span>
            </div>
          )
        },
        {
          key: "price", header: "Price", sortable: true, sortValue: (r) => r.price,
          render: (r) => (
            <span className="font-mono">{formatCurrency(r.price, r.currency)}/<span className="text-slate-400">{r.billingCycle === "monthly" ? "mo" : "yr"}</span></span>
          )
        },
        {
          key: "commission", header: "Commission", sortable: true, sortValue: (r) => r.organizerCommissionPercent,
          render: (r) => <span className="text-primary font-medium">{r.organizerCommissionPercent}%</span>
        },
        {
          key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
          render: (r) => <StatusBadge value={r.status} />
        }
      ]}
    />
  )
}
