"use client"

import { useQuery } from "@tanstack/react-query"
import { ResourcePage } from "@/components/admin/resource-page"
import { DateCell, EntityCell, PillBadge } from "@/components/admin/cells"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { OrganizerFeedback } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"

function ratingLabel(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe}/5`
}

export default function OrganizerFeedbackPage() {
  const token = useSessionStore((s) => s.token)
  const query = useQuery({
    queryKey: ["organizer-feedback"],
    queryFn: () => api.getOrganizerFeedback(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const rows = Array.isArray(query.data) ? query.data : []
  const averageRating = rows.length
    ? (rows.reduce((total, item) => total + (Number.isFinite(item.rating) ? item.rating : 0), 0) / rows.length).toFixed(1)
    : "0.0"
  const recentCount = rows.filter((item) => {
    const parsed = new Date(item.createdAt)
    return Number.isFinite(parsed.getTime()) && Date.now() - parsed.getTime() <= 30 * 24 * 60 * 60 * 1000
  }).length

  return (
    <ResourcePage<OrganizerFeedback>
      title="Feedback"
      description="Review feedback submitted by exhibitors for your expos."
      stats={[
        { id: "total", label: "Feedback", value: String(rows.length), delta: "exhibitor responses", trend: "neutral" },
        { id: "average", label: "Average Rating", value: averageRating, delta: "out of 5", trend: Number(averageRating) >= 4 ? "up" : "neutral" },
        { id: "recent", label: "Last 30 Days", value: String(recentCount), delta: "new responses", trend: recentCount > 0 ? "up" : "neutral" }
      ]}
      rows={rows}
      exportFileName="organizer-feedback.csv"
      searchPlaceholder="Search by expo, exhibitor, or comment..."
      searchText={(r) => `${r.expoName} ${r.respondentName} ${r.category} ${r.comment} ${r.improvements || ""} ${r.dislikes || ""}`}
      statusAccessor={(r) => r.category}
      emptyTitle="No exhibitor feedback yet"
      emptyDescription="Feedback will appear here after exhibitors submit organizer feedback from an expo workspace."
      columns={[
        {
          key: "expoName",
          header: "Expo",
          sortable: true,
          sortValue: (r) => r.expoName,
          exportValue: (r) => r.expoName,
          render: (r) => <EntityCell primary={r.expoName} sub={r.category} />
        },
        {
          key: "respondentName",
          header: "Exhibitor",
          sortable: true,
          sortValue: (r) => r.respondentName,
          exportValue: (r) => r.respondentName,
          render: (r) => <span className="text-sm font-medium text-foreground">{r.respondentName}</span>
        },
        {
          key: "rating",
          header: "Rating",
          sortable: true,
          sortValue: (r) => r.rating,
          exportValue: (r) => ratingLabel(r.rating),
          render: (r) => <span className="text-sm font-semibold tabular-nums text-foreground">{ratingLabel(r.rating)}</span>
        },
        {
          key: "category",
          header: "Category",
          sortable: true,
          sortValue: (r) => r.category,
          exportValue: (r) => r.category,
          render: (r) => <PillBadge value={r.category} tone="primary" />
        },
        {
          key: "comment",
          header: "Comment",
          exportValue: (r) => r.comment,
          render: (r) => <span className="line-clamp-2 max-w-md text-sm text-slate-600">{r.comment || "No comment"}</span>
        },
        {
          key: "improvements",
          header: "Improvements",
          exportValue: (r) => r.improvements || r.suggestions || "",
          render: (r) => <span className="line-clamp-2 max-w-sm text-sm text-slate-500">{r.improvements || r.suggestions || "Not provided"}</span>
        },
        {
          key: "dislikes",
          header: "Dislikes",
          exportValue: (r) => r.dislikes || "",
          render: (r) => <span className="line-clamp-2 max-w-sm text-sm text-slate-500">{r.dislikes || "Not provided"}</span>
        },
        {
          key: "createdAt",
          header: "Submitted",
          sortable: true,
          sortValue: (r) => r.createdAt,
          exportValue: (r) => r.createdAt,
          render: (r) => <DateCell value={r.createdAt} />
        }
      ]}
    />
  )
}
