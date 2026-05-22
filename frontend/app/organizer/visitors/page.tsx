"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ResourcePage } from "@/components/admin/resource-page"
import { StatusBadge } from "@/components/admin/status-badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { VisitorRecord } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { AvatarCell, DateCell } from "@/components/admin/cells"
import { ErrorState } from "@/components/ui/error-state"
import { formatDate } from "@/lib/utils"

export default function OrganizerVisitorsPage() {
  const token = useSessionStore((s) => s.token)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null)
  const query = useQuery({
    queryKey: ["organizer-visitors"],
    queryFn: () => api.getOrganizerVisitors(token || ""),
    enabled: Boolean(token)
  })

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  if (query.isLoading || !query.data) return <Spinner className="mx-auto mt-32 h-8 w-8 text-primary" />

  const rows = query.data.items.filter((visitor) => Number(visitor.exposAttended || 0) > 0)

  return (
    <>
      <ResourcePage<VisitorRecord>
        title="Visitors"
        description="Track visitors who engaged with your organizer expos."
        stats={query.data.stats}
        rows={rows}
        exportFileName="visitors.csv"
        searchPlaceholder="Search by name or email..."
        searchText={(r) => `${r.name} ${r.email} ${(r.visitedExpos || []).map((expo) => expo.name).join(" ")}`}
        statusAccessor={(r) => r.status}
        emptyTitle="No visitors yet"
        emptyDescription="Visitors will appear here after they visit or engage with your expos."
        columns={[
          {
            key: "name", header: "Visitor", sortable: true, sortValue: (r) => r.name,
            exportValue: (r) => r.name,
            render: (r) => <AvatarCell name={r.name} />
          },
          {
            key: "email", header: "Email", sortable: true, exportValue: (r) => r.email,
            render: (r) => <span className="text-sm text-slate-500">{r.email}</span>
          },
          {
            key: "exposAttended", header: "Expos", sortable: true, exportValue: (r) => r.exposAttended,
            render: (r) => (
              <button
                type="button"
                onClick={() => setSelectedVisitor(r)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white focus:outline-none focus:ring-4 focus:ring-primary/15"
              >
                {r.exposAttended}
              </button>
            )
          },
          {
            key: "interactions", header: "Interactions", sortable: true, exportValue: (r) => r.interactions,
            render: (r) => <span className="text-sm text-slate-500">{r.interactions}</span>
          },
          {
            key: "lastActivity", header: "Last Activity", sortable: true, exportValue: (r) => r.lastActivity,
            render: (r) => <DateCell value={r.lastActivity} />
          },
          {
            key: "status", header: "Status", sortable: true, exportValue: (r) => r.status,
            render: (r) => <StatusBadge value={r.status} />
          }
        ]}
      />

      {selectedVisitor && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="visitor-expos-title"
          onClick={() => setSelectedVisitor(null)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-border/80 bg-card shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border/70 px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Visited expos</p>
              <h2 id="visitor-expos-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {selectedVisitor.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{selectedVisitor.email || "No email captured"}</p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-4">
              {(selectedVisitor.visitedExpos || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-slate-500">
                  No expo visits captured for this visitor.
                </div>
              ) : (
                <div className="space-y-3">
                  {(selectedVisitor.visitedExpos || []).map((expo) => (
                    <div key={expo.id} className="rounded-2xl border border-border/70 bg-elevated/50 p-4">
                      <p className="text-sm font-semibold text-foreground">{expo.name}</p>
                      <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        <span>{expo.interactions} interaction{expo.interactions === 1 ? "" : "s"}</span>
                        <span className="sm:text-right">Last visit: {formatDate(expo.lastActivity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border/70 px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setSelectedVisitor(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
