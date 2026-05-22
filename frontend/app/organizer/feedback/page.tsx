"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ResourcePage } from "@/components/admin/resource-page"
import { DateCell, EntityCell, PillBadge } from "@/components/admin/cells"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
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
  const [selectedFeedback, setSelectedFeedback] = useState<OrganizerFeedback | null>(null)
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
    <>
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
        rowActions={[
          {
            label: "View feedback",
            onClick: (row) => setSelectedFeedback(row)
          }
        ]}
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

      {selectedFeedback ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-dialog-title"
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/70 bg-card p-6 shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">Exhibitor Feedback</p>
                <h2 id="feedback-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {selectedFeedback.expoName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedFeedback.respondentName} · {ratingLabel(selectedFeedback.rating)} · {selectedFeedback.category}
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelectedFeedback(null)}>Close</Button>
            </div>

            <div className="mt-5 grid gap-4">
              <FeedbackBlock title="Comment" value={selectedFeedback.comment || "No comment provided."} />
              <FeedbackBlock title="Improvements" value={selectedFeedback.improvements || selectedFeedback.suggestions || "No improvement notes provided."} />
              <FeedbackBlock title="Dislikes" value={selectedFeedback.dislikes || "No dislikes provided."} />
              <div className="rounded-2xl border border-border/70 bg-elevated/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Submitted</p>
                <div className="mt-2">
                  <DateCell value={selectedFeedback.createdAt} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function FeedbackBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-elevated/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{value}</p>
    </section>
  )
}
