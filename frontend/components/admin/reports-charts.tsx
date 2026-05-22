"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AdministratorReportsResponse } from "@/lib/api/contracts"

const chartPalette = [
  "hsl(var(--primary))",
  "#14b8a6",
  "#f59e0b",
  "#0ea5e9",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4"
]

type TooltipPayload = {
  color?: string
  value?: number | string
  payload?: { label?: string; value?: number | string }
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null

  const item = payload[0]

  return (
    <div className="rounded-2xl border border-border/90 bg-card/95 px-4 py-3 shadow-float backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
    </div>
  )
}

export function ReportsCharts({ data }: { data: AdministratorReportsResponse }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="overflow-hidden border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Revenue Momentum</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Revenue trend by month</h2>
            <p className="mt-2 text-sm text-slate-500">Month-over-month platform revenue performance across the active reporting window.</p>
          </div>
          <div className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Revenue
          </div>
        </div>

        <div className="mt-8 h-[320px] rounded-2xl border border-border/70 bg-elevated/80 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueSeries} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                  <stop offset="48%" stopColor="#14b8a6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 6" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={36} />
              <Tooltip cursor={{ stroke: "rgba(99,102,241,0.25)", strokeWidth: 1 }} content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#revenueFill)"
                activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--accent))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Platform Activity Mix</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Engagement by data source</h2>
            <p className="mt-2 text-sm text-slate-500">Relative activity across leads, notifications, expos, and available platform signals.</p>
          </div>
          <div className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Healthy spread
          </div>
        </div>

        <div className="mt-8 h-[320px] rounded-2xl border border-border/70 bg-elevated/80 px-3 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.engagementSeries} margin={{ top: 10, right: 8, left: -16, bottom: 0 }} barCategoryGap={18}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" strokeDasharray="3 6" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={36} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[10, 10, 4, 4]}>
                {data.engagementSeries.map((item, index) => (
                  <Cell key={item.label} fill={chartPalette[index % chartPalette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
