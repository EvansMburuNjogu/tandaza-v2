"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChartIcon, ArrowsUpDownIcon } from "@/components/ui/icons"
import { AIAnalyticsSummary } from "@/lib/api/contracts"
import { cn } from "@/lib/utils"

export function AIPerformanceSummaryCard({
  summary,
  queryKey,
  onGenerate,
  className
}: {
  summary?: AIAnalyticsSummary
  queryKey: readonly unknown[]
  onGenerate: () => Promise<AIAnalyticsSummary>
  className?: string
}) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: onGenerate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey })
      toast.success("AI summary generated")
    },
    onError: (error) => {
      toast.error("Could not generate performance summary", { description: error instanceof Error ? error.message : "Try again after the latest analytics data has loaded." })
    }
  })

  const hasGenerated = Boolean(summary?.generatedAt)
  const generatedAt = summary?.generatedAt ? new Date(summary.generatedAt) : null
  const status = summary?.status || "fallback"

  return (
    <Card className={cn("overflow-hidden border-primary/15 bg-[linear-gradient(135deg,rgba(99,102,241,0.11),transparent_48%),hsl(var(--card))] p-6", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <ChartIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">AI Performance Summary</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Recommendations from your analytics data</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{summary?.summary || "Generate a summary to turn current performance data into focused recommendations."}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">
            {hasGenerated && generatedAt ? `Generated ${generatedAt.toLocaleString()}` : "No generated summary yet"}{status === "fallback" ? " · Tandaza insight mode" : ""}
          </p>
        </div>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="shrink-0">
          <ArrowsUpDownIcon className={cn("mr-2 h-4 w-4", mutation.isPending && "animate-spin")} />
          {hasGenerated ? "Refresh summary" : "Generate summary"}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <InsightList title="Opportunities" items={summary?.opportunities} />
        <InsightList title="Recommendations" items={summary?.recommendations} />
        <InsightList title="Next actions" items={summary?.nextActions} />
      </div>

      {summary?.risks?.length ? (
        <div className="mt-5 rounded-2xl border border-border/80 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Risks to watch</p>
          <ul className="mt-3 space-y-2">
            {summary.risks.map((item) => (
              <li key={item} className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary?.confidenceNotes ? <p className="mt-4 text-xs leading-5 text-slate-500">{summary.confidenceNotes}</p> : null}
    </Card>
  )
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  const list = items?.length ? items : ["Generate a summary to see this section."]
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {list.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</li>
        ))}
      </ul>
    </div>
  )
}
