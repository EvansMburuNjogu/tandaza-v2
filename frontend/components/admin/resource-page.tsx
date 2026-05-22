"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { DashboardStat } from "@/lib/api/contracts"
import { DataTable, DataTableColumn, DataTableRowAction } from "@/components/admin/data-table"
import { StatCard } from "@/components/admin/stat-card"
import { PageHeader } from "@/components/admin/page-header"
import { DownloadIcon, PlusIcon, SearchIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export function ResourcePage<T extends { id: string }>({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  stats,
  rows,
  columns,
  searchPlaceholder,
  searchText,
  statusAccessor,
  exportFileName,
  rowActions,
  emptyTitle,
  emptyDescription
}: {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
  stats: DashboardStat[]
  rows: T[]
  columns: DataTableColumn<T>[]
  searchPlaceholder: string
  searchText: (row: T) => string
  statusAccessor?: (row: T) => string
  exportFileName?: string
  rowActions?: DataTableRowAction<T>[]
  emptyTitle: string
  emptyDescription: string
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const safeRows = Array.isArray(rows) ? rows : []
  const safeStats = Array.isArray(stats) ? stats : []

  const statuses = useMemo(() => {
    if (!statusAccessor) return []
    return Array.from(new Set(safeRows.map((row) => statusAccessor(row)).filter(Boolean))).sort()
  }, [safeRows, statusAccessor])

  const filteredRows = useMemo(() => {
    return safeRows.filter((row) => {
      const matchesSearch = String(searchText(row) || "").toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === "all" || !statusAccessor || statusAccessor(row) === status
      return matchesSearch && matchesStatus
    })
  }, [query, safeRows, searchText, status, statusAccessor])

  function exportCsv() {
    const headers = columns.map((col) => col.header)
    const csvRows = filteredRows.map((row) =>
      columns.map((col) => {
        const raw = row[col.key as keyof T]
        const value = col.exportValue ? col.exportValue(row) : typeof raw === "string" || typeof raw === "number" ? raw : ""
        return `"${String(value).replaceAll('"', '""')}"`
      }).join(",")
    )
    const csv = [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = exportFileName || `${title.toLowerCase().replaceAll(/\s+/g, "-")}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const isAddAction = actionLabel?.toLowerCase().startsWith("add") ||
    actionLabel?.toLowerCase().startsWith("create") ||
    actionLabel?.toLowerCase().startsWith("invite") ||
    actionLabel?.toLowerCase().startsWith("new")

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:border-primary/25 hover:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <DownloadIcon className="h-4 w-4 text-slate-400" />
              Export
            </button>
            {actionLabel && actionHref && (
              <Link
                href={actionHref}
                className="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-px hover:shadow-float focus:outline-none focus:ring-4 focus:ring-primary/20 active:translate-y-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
              >
                {isAddAction ? <PlusIcon className="h-4 w-4" /> : <DownloadIcon className="h-4 w-4" />}
                {actionLabel}
              </Link>
            )}
            {actionLabel && !actionHref && actionOnClick && (
              <button
                onClick={actionOnClick}
                className="inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-px hover:shadow-float focus:outline-none focus:ring-4 focus:ring-primary/20 active:translate-y-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
              >
                {isAddAction ? <PlusIcon className="h-4 w-4" /> : <DownloadIcon className="h-4 w-4" />}
                {actionLabel}
              </button>
            )}
          </div>
        }
      />

      {/* Stat cards */}
      {safeStats.length > 0 && (
        <div className={cn(
          "grid gap-4",
          safeStats.length <= 2 && "sm:grid-cols-2",
          safeStats.length === 3 && "sm:grid-cols-2 xl:grid-cols-3",
          safeStats.length >= 4 && "sm:grid-cols-2 xl:grid-cols-4"
        )}>
          {safeStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-card backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-border/70 bg-elevated py-2.5 pl-10 pr-9 text-sm text-foreground shadow-sm placeholder:text-slate-400/60 transition focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:text-foreground"
              aria-label="Clear search"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          {statusAccessor && statuses.length > 0 && (
            <div className="relative">
              {status !== "all" && (
                <span className="absolute -right-1 -top-1 z-10 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
              )}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 appearance-none rounded-2xl border border-border/70 bg-elevated py-0 pl-3.5 pr-8 text-sm text-foreground shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="all">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none">
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          )}

          {/* Record count pill */}
          <div className="flex h-10 items-center rounded-2xl border border-border/70 bg-elevated px-3.5 shadow-sm">
            <span className="font-semibold tabular-nums text-sm text-foreground">{filteredRows.length}</span>
            <span className="ml-1 text-xs text-slate-500">record{filteredRows.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        rowActions={rowActions}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  )
}
