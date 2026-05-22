"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { SponsorRecord } from "@/lib/api/contracts"
import { formatDate } from "@/lib/utils"
import { useSessionStore } from "@/store/session-store"
import { useAdminCountryStore } from "@/store/admin-country-store"
import { AvatarCell, DateCell, PillBadge } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"

export default function SponsorsPage() {
  const token = useSessionStore((s) => s.token)
  const selectedCountry = useAdminCountryStore((s) => s.selectedCountry)
  const router = useRouter()
  const query = useQuery({
    queryKey: ["admin-sponsors", selectedCountry],
    queryFn: () => api.getAdminSponsors(token || "", selectedCountry),
    enabled: Boolean(token)
  })

  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <ResourcePage<SponsorRecord>
      title="Sponsor Management"
      description="Manage sponsor packages, campaign state, and relationship health from a central table."
      actionLabel="Add Sponsor"
      actionHref="/administrator/sponsors/new"
      stats={query.data.stats}
      rows={query.data.items}
      exportFileName="sponsors.csv"
      searchPlaceholder="Search by company, account, or email…"
      searchText={(r) => `${r.sponsor} ${r.company} ${r.email}`}
      statusAccessor={(r) => r.campaignStatus}
      rowActions={[
        { label: "View sponsor", onClick: (r) => router.push(`/administrator/sponsors/${r.id}`) },
        { label: "Edit sponsor", onClick: (r) => router.push(`/administrator/sponsors/${r.id}/edit`) }
      ]}
      emptyTitle="No sponsors found"
      emptyDescription="There are no sponsors for the current filters."
      columns={[
        {
          key: "sponsor", header: "Sponsor", sortable: true, sortValue: (r) => r.sponsor,
          exportValue: (r) => `${r.sponsor} - ${r.company}`,
          render: (r) => <AvatarCell name={r.sponsor} sub={r.company} />
        },
        {
          key: "email", header: "Email", sortable: true, exportValue: (r) => r.email,
          render: (r) => <span className="text-sm text-slate-500">{r.email}</span>
        },
        {
          key: "package", header: "Package", sortable: true, exportValue: (r) => r.package,
          render: (r) => <PillBadge value={r.package} tone="primary" />
        },
        {
          key: "campaignStatus", header: "Campaign", sortable: true, exportValue: (r) => r.campaignStatus,
          render: (r) => <StatusBadge value={r.campaignStatus} />
        },
        {
          key: "createdAt", header: "Created", sortable: true, sortValue: (r) => r.createdAt,
          exportValue: (r) => formatDate(r.createdAt),
          render: (r) => <DateCell value={r.createdAt} />
        }
      ]}
    />
  )
}
