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
  fallbackSummary,
  queryKey,
  onGenerate,
  className
}: {
  summary?: AIAnalyticsSummary
  fallbackSummary?: AIAnalyticsSummary
  queryKey: readonly unknown[]
  onGenerate: () => Promise<AIAnalyticsSummary>
  className?: string
}) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: onGenerate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey })
      toast.success("Performance summary generated")
    },
    onError: (error) => {
      toast.error("Could not generate performance summary", { description: error instanceof Error ? error.message : "Try again after the latest analytics data has loaded." })
    }
  })

  const displaySummary = summary?.generatedAt ? summary : fallbackSummary || summary
  const hasGenerated = Boolean(summary?.generatedAt)
  const generatedAt = summary?.generatedAt ? new Date(summary.generatedAt) : null

  return (
    <Card className={cn("overflow-hidden border-primary/15 bg-card p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <ChartIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">AI Summary</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Top recommendations</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {hasGenerated && generatedAt ? `Updated ${generatedAt.toLocaleString()}` : "Generated from current report data"}
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="shrink-0">
          <ArrowsUpDownIcon className={cn("mr-2 h-4 w-4", mutation.isPending && "animate-spin")} />
          {hasGenerated ? "Refresh summary" : "Generate summary"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InsightPill title="Opportunity" items={displaySummary?.opportunities} />
        <InsightPill title="Recommendation" items={displaySummary?.recommendations} />
        <InsightPill title="Next action" items={displaySummary?.nextActions} />
      </div>
    </Card>
  )
}

function InsightPill({ title, items }: { title: string; items?: string[] }) {
  const item = items?.find(Boolean) || "Generate summary"
  return (
    <div className="rounded-2xl border border-border/80 bg-elevated/55 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{shortenInsight(item)}</p>
    </div>
  )
}

function shortenInsight(value: string, maxLength = 92) {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  const sliced = cleaned.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(" ")
  return `${sliced.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`
}
