"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button, buttonClasses } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { ChevronDownIcon, SearchIcon } from "@/components/ui/icons"
import { DataTable, DataTableColumn } from "@/components/admin/data-table"
import { api } from "@/lib/api"
import { VisitorPreOrder } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

const STATUS_OPTIONS: Array<{ value: VisitorPreOrder["status"] | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_delivery", label: "Ready for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" }
]

const PAGE_SIZE = 8

function orderDate(order: VisitorPreOrder) {
  return order.orderedAt || order.createdAt || ""
}

function orderAmount(order: VisitorPreOrder) {
  return Number(order.amount ?? order.price ?? 0)
}

function statusLabel(status: VisitorPreOrder["status"]) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status
}

function statusClass(status: VisitorPreOrder["status"]) {
  if (status === "delivered" || status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (status === "cancelled") return "bg-rose-50 text-rose-700 ring-rose-200"
  if (status === "confirmed" || status === "processing" || status === "ready_for_delivery") return "bg-primary/10 text-primary ring-primary/20"
  return "bg-amber-50 text-amber-700 ring-amber-200"
}

function OrderCard({ order }: { order: VisitorPreOrder }) {
  const href = order.expoId && order.exhibitorId
    ? `/visitor/expos/${order.expoId}/exhibitors/${order.exhibitorId}${order.productId ? `/products/${order.productId}` : ""}`
    : "/visitor/expos"

  return (
    <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClass(order.status))}>
              {statusLabel(order.status)}
            </span>
            {order.expoName ? <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-semibold text-muted">{order.expoName}</span> : null}
          </div>
          <h2 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight text-foreground">{order.productName || "Product pre-order"}</h2>
          <p className="mt-1 text-sm text-muted">{order.exhibitorName || "Exhibitor"}</p>
          <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
            <div className="rounded-2xl bg-elevated px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Qty</span>
              <p className="mt-1 font-mono font-semibold text-foreground">{order.quantity || 1}</p>
            </div>
            <div className="rounded-2xl bg-elevated px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Amount</span>
              <p className="mt-1 font-mono font-semibold text-foreground">{formatCurrency(orderAmount(order), order.currency || "KES")}</p>
            </div>
            <div className="rounded-2xl bg-elevated px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Date</span>
              <p className="mt-1 font-semibold text-foreground">{formatDate(orderDate(order))}</p>
            </div>
          </div>
        </div>
        <Link href={href} className={buttonClasses({ variant: "secondary", className: "shrink-0 justify-center" })}>
          View
        </Link>
      </div>
    </Card>
  )
}

export default function VisitorOrdersPage() {
  const token = useSessionStore((s) => s.token)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<VisitorPreOrder["status"] | "all">("all")
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-orders"],
    queryFn: () => api.getVisitorPreOrders(token || ""),
    enabled: Boolean(token)
  })

  const orders = data || []
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      const statusOk = status === "all" || order.status === status
      const queryOk = !query || [order.productName, order.exhibitorName, order.expoName, order.currency, order.status]
        .some((value) => String(value || "").toLowerCase().includes(query))
      return statusOk && queryOk
    })
  }, [orders, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleOrders = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const columns = useMemo<DataTableColumn<VisitorPreOrder>[]>(() => [
    {
      key: "productName",
      header: "Product",
      sortable: true,
      sortValue: (order) => order.productName || "",
      render: (order) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{order.productName || "Product pre-order"}</p>
          <p className="mt-1 text-xs text-muted">{order.exhibitorName || "Exhibitor"}</p>
        </div>
      )
    },
    {
      key: "expoName",
      header: "Expo",
      sortable: true,
      sortValue: (order) => order.expoName || "",
      render: (order) => <span className="text-sm text-muted">{order.expoName || "N/A"}</span>
    },
    {
      key: "quantity",
      header: "Qty",
      sortable: true,
      sortValue: (order) => order.quantity || 1,
      render: (order) => <span className="font-mono text-sm font-semibold text-foreground">{order.quantity || 1}</span>
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortValue: (order) => orderAmount(order),
      render: (order) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(orderAmount(order), order.currency || "KES")}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (order) => order.status,
      render: (order) => (
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClass(order.status))}>
          {statusLabel(order.status)}
        </span>
      )
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (order) => orderDate(order),
      render: (order) => <span className="text-sm text-muted">{formatDate(orderDate(order))}</span>
    },
    {
      key: "action",
      header: "Action",
      render: (order) => {
        const href = order.expoId && order.exhibitorId
          ? `/visitor/expos/${order.expoId}/exhibitors/${order.exhibitorId}${order.productId ? `/products/${order.productId}` : ""}`
          : "/visitor/expos"

        return (
          <Link href={href} className={buttonClasses({ variant: "secondary", className: "h-9 px-3" })}>
            View
          </Link>
        )
      }
    }
  ], [])

  if (isLoading || !data) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading pre-orders...</p>
        </div>
      </SessionGuard>
    )
  }

  if (error) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <ErrorState title="Failed to load pre-orders" />
      </SessionGuard>
    )
  }

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="max-w-full space-y-6 overflow-hidden pb-6">
        <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.14),transparent_34%),linear-gradient(135deg,#ffffff,#faf8ff_62%,#f8fafc)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">Purchase intent</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Pre-orders</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Products you have requested from exhibitors, with status updates in one place.</p>
            </div>
            <Link href="/visitor/expos" className={buttonClasses({ className: "justify-center" })}>Browse expos</Link>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{filtered.length.toLocaleString()} pre-order{filtered.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-xs text-muted">Search by product, exhibitor, expo, or status.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative sm:w-80">
                <span className="sr-only">Search pre-orders</span>
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  placeholder="Search pre-orders"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  className="pl-11"
                />
              </label>
              <span className="relative block">
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as VisitorPreOrder["status"] | "all")
                    setPage(1)
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-border bg-elevated px-4 pr-10 text-sm font-medium text-foreground outline-none transition hover:border-primary/40 focus:border-primary/70 focus:ring-4 focus:ring-ring/10 sm:w-52"
                >
                  {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </span>
            </div>
          </div>
        </Card>

        {filtered.length ? (
          <>
            <div className="hidden md:block">
              <DataTable<VisitorPreOrder>
                rows={filtered}
                columns={columns}
                pageSize={PAGE_SIZE}
                emptyTitle="No pre-orders yet"
                emptyDescription="Open an expo, choose an exhibitor product, and make a pre-order."
              />
            </div>
            <div className="grid gap-4 md:hidden">
              {visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)}
            </div>
          </>
        ) : (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">PO</div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">No pre-orders yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Open an expo, choose an exhibitor product, and make a pre-order. Your requests will appear here.</p>
            <Link href="/visitor/expos" className={buttonClasses({ className: "mt-5" })}>Browse expos</Link>
          </Card>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-3 py-2 text-sm md:hidden">
            <span className="text-xs font-semibold text-muted">Page {safePage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <Button type="button" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
            </div>
          </div>
        ) : null}
      </div>
    </SessionGuard>
  )
}
