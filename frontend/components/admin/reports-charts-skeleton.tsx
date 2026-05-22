import { Card } from "@/components/ui/card"

export function ReportsChartsSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {[0, 1].map((index) => (
        <Card key={index} className="overflow-hidden p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-3 w-28 rounded-full bg-secondary" />
                <div className="h-8 w-64 rounded-full bg-secondary" />
                <div className="h-4 w-80 max-w-full rounded-full bg-secondary" />
              </div>
              <div className="h-7 w-20 rounded-full bg-secondary" />
            </div>
            <div className="rounded-2xl border border-border/70 bg-elevated/80 p-4">
              <div className="h-[288px] rounded-2xl bg-secondary/80" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
