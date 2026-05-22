"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Card } from "@/components/ui/card"
import { ArrowsUpDownIcon, ChevronDownIcon, ChevronUpIcon, EllipsisIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export type DataTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  sortable?: boolean
  sortValue?: (row: T) => string | number
  exportValue?: (row: T) => string | number
}

export type DataTableRowAction<T> = {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  tone?: "default" | "danger"
  hidden?: (row: T) => boolean
}

// ── Infer a small SVG icon from the action label text ──────────────────────
function ActionIcon({ label }: { label: string }) {
  const l = label.toLowerCase()

  if (l.includes("view") || l.includes("open") || l.includes("show"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M1 7C1 7 3.5 2.5 7 2.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )

  if (l.includes("edit") || l.includes("modify") || l.includes("update"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )

  if (l.includes("approve") || l.includes("verify") || l.includes("activate"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )

  if (l.includes("retry") || l.includes("resend") || l.includes("reset"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 4v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )

  if (l.includes("export") || l.includes("download"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v7M4 6.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )

  if (l.includes("delete") || l.includes("remove") || l.includes("archive"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M2 4h10M9 4V3H5v1M5.5 6.5v4M8.5 6.5v4M3.5 4l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )

  if (l.includes("suspend") || l.includes("reject") || l.includes("flag") || l.includes("ban") || l.includes("deactivate"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3.5 10.5l7-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )

  if (l.includes("invite"))
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
        <path d="M9 12v-1.5A2.5 2.5 0 0 0 6.5 8h-3A2.5 2.5 0 0 0 1 10.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M11 5v4M9 7h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )

  // Default: arrow
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7h9M8 3.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Row action dropdown — portal-based, escapes overflow-x-auto clipping ──
function RowActionsDropdown<T>({
  row,
  actions,
  open,
  onOpen,
  onClose
}: {
  row: T
  actions: DataTableRowAction<T>[]
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({
        top: Math.min(rect.bottom + 8, window.innerHeight - 12),
        right: Math.max(12, window.innerWidth - rect.right)
      })
    }

    updatePosition()

    function handleMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return
      onClose()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true })
    window.addEventListener("resize", updatePosition)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", updatePosition, { capture: true })
      window.removeEventListener("resize", updatePosition)
    }
  }, [open, onClose])

  const visibleActions = actions.filter((action) => !action.hidden?.(row))
  const safeActions = visibleActions.filter((a) => a.tone !== "danger")
  const dangerActions = visibleActions.filter((a) => a.tone === "danger")
  const hasVisibleActions = visibleActions.length > 0

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        disabled={!hasVisibleActions}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition",
          !hasVisibleActions && "cursor-not-allowed opacity-35",
          open
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border/70 bg-elevated text-slate-400 hover:border-primary/25 hover:bg-card hover:text-foreground"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open row actions"
      >
        <EllipsisIcon className="h-3.5 w-3.5" />
      </button>
      {open && hasVisibleActions && pos && typeof window !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-[9999] min-w-52 animate-dropdown-in rounded-2xl border border-border/80 bg-card/95 py-1.5 text-left shadow-float backdrop-blur-xl"
        >
            {safeActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => { action.onClick(row); onClose() }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition hover:bg-elevated"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-slate-500">
                  {action.icon ?? <ActionIcon label={action.label} />}
                </span>
                <span className="text-[13px] font-medium text-foreground">{action.label}</span>
              </button>
            ))}
            {safeActions.length > 0 && dangerActions.length > 0 && (
              <div className="mx-3 my-1.5 h-px bg-border/70" />
            )}
            {dangerActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => { action.onClick(row); onClose() }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition hover:bg-danger/8"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                  {action.icon ?? <ActionIcon label={action.label} />}
                </span>
                <span className="text-[13px] font-medium text-danger">{action.label}</span>
              </button>
            ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export type DataTablePagination = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  pageSize = 8,
  rowActions,
  emptyTitle,
  emptyDescription,
  pagination
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  pageSize?: number
  rowActions?: DataTableRowAction<T>[]
  emptyTitle: string
  emptyDescription: string
  pagination?: DataTablePagination
}) {
  const [page, setPage] = useState(1)
  const [pageSizeValue, setPageSizeValue] = useState(pageSize)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null)

  const currentPage = pagination?.page ?? page
  const currentPageSize = pagination?.pageSize ?? pageSizeValue
  const onPageChange = pagination?.onPageChange ?? setPage

  useEffect(() => {
    setPage(1)
  }, [rows.length, currentPageSize])

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows

    const column = columns.find((item) => item.key === sortKey)
    if (!column) return rows

    const getValue = (row: T) => {
      if (column.sortValue) return column.sortValue(row)
      const raw = row[sortKey as keyof T]
      if (typeof raw === "string" || typeof raw === "number") return raw
      return String(raw ?? "")
    }

    return [...rows].sort((left, right) => {
      const leftValue = getValue(left) ?? ""
      const rightValue = getValue(right) ?? ""
      if (leftValue === rightValue) return 0
      const comparison = leftValue > rightValue ? 1 : -1
      return sortDirection === "asc" ? comparison : comparison * -1
    })
  }, [columns, rows, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / currentPageSize))

  const visibleRows = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * currentPageSize
    return sortedRows.slice(start, start + currentPageSize)
  }, [currentPage, currentPageSize, sortedRows, totalPages])

  const currentPageSafe = Math.min(currentPage, totalPages)
  const startIndex = sortedRows.length ? (currentPageSafe - 1) * currentPageSize + 1 : 0
  const endIndex = sortedRows.length ? Math.min(currentPageSafe * currentPageSize, sortedRows.length) : 0

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return
    if (sortKey === column.key) {
      setSortDirection((v) => (v === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(column.key)
    setSortDirection("asc")
  }

  const hasActions = Boolean(rowActions?.length)

  return (
    <Card className="overflow-hidden border-border/60 bg-card/86 shadow-card backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {/* ── Header ─────────────────────────────── */}
          <thead>
            <tr className="border-b border-border/60 bg-elevated/80">
              {columns.map((column) => (
                <th
                  key={column.key}
                  aria-sort={
                    !column.sortable ? undefined
                    : sortKey === column.key
                      ? sortDirection === "asc" ? "ascending" : "descending"
                      : "none"
                  }
                  className={cn("px-5 py-3 text-left", column.className)}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 transition",
                      column.sortable ? "cursor-pointer hover:text-foreground" : "cursor-default"
                    )}
                  >
                    <span>{column.header}</span>
                    {column.sortable && (
                      sortKey === column.key ? (
                        sortDirection === "asc"
                          ? <ChevronUpIcon className="h-3 w-3 text-primary" />
                          : <ChevronDownIcon className="h-3 w-3 text-primary" />
                      ) : (
                        <ArrowsUpDownIcon className="h-3 w-3 text-slate-300" />
                      )
                    )}
                  </button>
                </th>
              ))}
              {hasActions && (
                <th className="w-24 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Actions</th>
              )}
            </tr>
          </thead>

          {/* ── Body ───────────────────────────────── */}
          <tbody className="divide-y divide-border/45">
            {visibleRows.length ? (
              visibleRows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={cn(
                    "group transition-colors duration-150",
                    rowIndex % 2 === 1 ? "bg-elevated/30" : "bg-transparent",
                    "hover:bg-primary/[0.06]"
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-5 py-4 align-middle text-sm text-foreground",
                        column.className
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}

                  {hasActions && (
                    <td className="px-4 py-3 text-right align-middle">
                      <RowActionsDropdown
                        row={row}
                        actions={rowActions!}
                        open={openActionRowId === row.id}
                        onOpen={() => setOpenActionRowId(row.id)}
                        onClose={() => setOpenActionRowId(null)}
                      />
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-5 py-24 text-center"
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl text-slate-400 shadow-sm ring-1 ring-border/80"
                      style={{ background: "linear-gradient(135deg, hsl(var(--elevated)) 0%, hsl(var(--card)) 100%)" }}
                    >
                      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M8 12h8M8 16h5M8 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
                      <p className="mt-1.5 text-xs text-slate-400">{emptyDescription}</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────── */}
      <div className="flex flex-col gap-3 border-t border-border/60 bg-elevated/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <p className="text-xs text-slate-500">
            {sortedRows.length === 0 ? (
              "No results"
            ) : (
              <>
                <span className="font-semibold tabular-nums text-foreground">{startIndex}–{endIndex}</span>
                {" of "}
                <span className="font-semibold tabular-nums text-foreground">{sortedRows.length}</span>
                {" results"}
              </>
            )}
          </p>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>Per page</span>
            <select
              value={pageSizeValue}
              onChange={(e) => setPageSizeValue(Number(e.target.value))}
              className="rounded-xl border border-border/70 bg-card px-2 py-1 text-xs text-foreground shadow-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
            >
              {[5, 8, 10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            disabled={currentPage <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card text-slate-500 shadow-sm transition hover:border-primary/25 hover:bg-elevated hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous page"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3L5 7l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="min-w-[4.5rem] rounded-xl border border-border/70 bg-card px-3 py-1.5 text-center text-xs font-semibold tabular-nums text-foreground shadow-sm">
            {currentPage} <span className="font-normal text-slate-400">/ {totalPages}</span>
          </span>
          <button
            type="button"
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card text-slate-500 shadow-sm transition hover:border-primary/25 hover:bg-elevated hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next page"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 3L9 7l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  )
}
