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
import { OrganizerReportsResponse, ReportSeriesItem } from "@/lib/api/contracts"

const palette = ["hsl(var(--primary))", "#14b8a6", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6", "#06b6d4"]

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number | string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-float">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{payload[0].value}</p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-elevated/60 text-sm text-slate-500">
      No report data yet
    </div>
  )
}

function ChartFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{subtitle}</h2>
      <div className="mt-6 h-[300px]">{children}</div>
    </Card>
  )
}

function safeSeries(items?: ReportSeriesItem[] | null) {
  return Array.isArray(items) ? items : []
}

function hasData(items?: ReportSeriesItem[] | null) {
  return safeSeries(items).some((item) => item.value > 0)
}

export function OrganizerReportsCharts({ data, view }: { data: OrganizerReportsResponse; view: "settlement" | "engagement" | "visitor" }) {
  if (view === "settlement") {
    const revenueSeries = safeSeries(data.revenueSeries)
    return (
      <ChartFrame title="Revenue Trend" subtitle="Monthly revenue from your expos">
        {!hasData(revenueSeries) ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="organizerRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                  <stop offset="45%" stopColor="#14b8a6" stopOpacity={0.13} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={42} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#organizerRevenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>
    )
  }

  const source = safeSeries(view === "engagement" ? data.engagementSeries : data.visitorDemographics)
  return (
    <ChartFrame
      title={view === "engagement" ? "Engagement" : "Visitors"}
      subtitle={view === "engagement" ? "Visitor engagement by period" : "Visitor distribution by source"}
    >
      {!hasData(source) ? <EmptyChart /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={source} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} width={42} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 3, 3]}>
              {source.map((item, index) => <Cell key={item.label} fill={palette[index % palette.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  )
}
