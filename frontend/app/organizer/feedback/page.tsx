"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/admin/page-header"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { ErrorState } from "@/components/ui/error-state"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

function getPageNumbers(current: number, total: number): (number | string)[] {
  const pages: (number | string)[] = []
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  pages.push(1)
  if (current > 3) pages.push("...")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function OrganizerFeedbackPage() {
  const token = useSessionStore((s) => s.token)
  const [page, setPage] = useState(1)
  
  const query = useQuery({
    queryKey: ["organizer-feedback"],
    queryFn: () => api.getOrganizerFeedback(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const feedback = Array.isArray(query.data) ? query.data : []
  const totalPages = Math.ceil(feedback.length / PAGE_SIZE)
  const startIndex = (page - 1) * PAGE_SIZE
  const paginatedFeedback = feedback.slice(startIndex, startIndex + PAGE_SIZE)

  const categoryStats = feedback.reduce((acc, f) => {
    const category = f.category || "overall"
    acc[category] = acc[category] || { total: 0, count: 0 }
    acc[category].total += Number.isFinite(f.rating) ? f.rating : 0
    acc[category].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  const categories = ["overall", "venue", "logistics", "communication", "support", "payments"] as const
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="View feedback from visitors and exhibitors to improve your expos."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {categories.map((cat) => {
          const stats = categoryStats[cat] || { total: 0, count: 0 }
          const avg = stats.count > 0 ? (stats.total / stats.count).toFixed(1) : "N/A"
          return (
            <Card key={cat} className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{cat}</p>
              <p className="mt-2 text-2xl font-semibold">{avg}</p>
              <p className="text-xs text-slate-500">{stats.count} responses</p>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border/70 bg-elevated/80 px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">All Feedback</p>
        </div>
        <div className="divide-y divide-border/40">
          {paginatedFeedback.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-foreground">No feedback yet</p>
              <p className="mt-1 text-sm text-slate-500">Feedback will appear after visitors engage with exhibitors in your expos.</p>
            </div>
          )}
          {paginatedFeedback.map((item) => (
            <div key={item.id} className="p-5 transition hover:bg-primary/[0.02]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.expoName}</p>
                  <p className="text-sm text-slate-500">
                    by {item.respondentName} ({item.respondentRole})
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= item.rating ? "text-amber-400" : "text-slate-300"
                      )}
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 1.5l2.1 4.2 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.2.8-4.7L1.2 6.4l4.7-.7L8 1.5z" />
                    </svg>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  {item.category}
                </span>
              </div>
              {item.comment && (
                <p className="mt-3 text-sm text-slate-600">{item.comment}</p>
              )}
              {item.suggestions && (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-medium">{item.respondentRole === "exhibitor" ? "Improvements:" : "Suggestion:"}</span> {item.suggestions}
                </p>
              )}
              {item.dislikes && (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-medium">Dislikes:</span> {item.dislikes}
                </p>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border/70 px-5 py-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, feedback.length)} of {feedback.length} results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 text-sm font-medium disabled:opacity-50"
                aria-label="Previous page"
              >
                ←
              </button>
              {pageNumbers.map((p, i) => (
                typeof p === "number" ? (
                  <button
                    key={i}
                    onClick={() => setPage(p)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                      p === page 
                        ? "bg-primary text-white" 
                        : "border border-border/80 hover:bg-elevated"
                    )}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={i} className="px-1 text-slate-400">...</span>
                )
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 text-sm font-medium disabled:opacity-50"
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
