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
  const summaryText = shortenInsight(displaySummary?.summary || "Generate a focused summary from the current analytics.")

  return (
    <Card className={cn("overflow-hidden border-primary/15 bg-[linear-gradient(135deg,rgba(99,102,241,0.10),transparent_42%),hsl(var(--card))] p-5 shadow-sm", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <ChartIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">AI Summary</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">What to do next</h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{summaryText}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            {hasGenerated && generatedAt ? `Updated ${generatedAt.toLocaleString()}` : "Based on the current report data"}
          </p>
        </div>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="shrink-0">
          <ArrowsUpDownIcon className={cn("mr-2 h-4 w-4", mutation.isPending && "animate-spin")} />
          {hasGenerated ? "Refresh summary" : "Generate summary"}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <InsightList title="Opportunities" items={displaySummary?.opportunities} />
        <InsightList title="Recommendations" items={displaySummary?.recommendations} />
        <InsightList title="Next actions" items={displaySummary?.nextActions} />
      </div>

      {displaySummary?.risks?.length ? (
        <div className="mt-3 rounded-2xl border border-border/80 bg-background/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Risks</p>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {displaySummary.risks.slice(0, 2).map((item) => (
              <li key={item} className="text-sm leading-6 text-slate-600 dark:text-slate-300">{shortenInsight(item)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  const list = items?.length ? items : ["Generate a summary to see this section."]
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {list.slice(0, 2).map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-600 dark:text-slate-300">{shortenInsight(item)}</li>
        ))}
      </ul>
    </div>
  )
}

function shortenInsight(value: string, maxLength = 150) {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  const sliced = cleaned.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(" ")
  return `${sliced.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`
}
