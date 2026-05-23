"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { findVisitorBooth, productDisplayPrice } from "@/lib/visitor-expo"
import { formatCurrency } from "@/lib/utils"

export default function VisitorPreOrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const [productId, setProductId] = useState(searchParams.get("product") || "")
  const [quantity, setQuantity] = useState(1)
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const sessionReady = Boolean(token && user?.role === "visitor")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })
  const booth = findVisitorBooth(data, exhibitorId)
  const product = useMemo(() => booth?.products.find((item) => item.id === productId), [booth?.products, productId])
  const total = product ? productDisplayPrice(product) * quantity : 0

  const mutation = useMutation({
    mutationFn: () => {
      if (!booth) throw new Error("Exhibitor not found")
      if (!product) throw new Error("Choose a product")
      if (!phone.trim()) throw new Error("Add your phone number")
      return api.createVisitorExpoAction(token || "", expoId, {
        boothId: booth.id,
        action: "pre_order",
        name: user?.name,
        email: user?.email,
        phone: phone.trim(),
        productId: product.id,
        productName: product.name,
        quantity,
        notes: notes.trim() || `Pre-order interest for ${product.name}`
      })
    },
    onSuccess: () => {
      setNotes("")
      toast.success("Pre-order interest sent")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send pre-order")
  })

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading pre-order...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth) return <ErrorState title="Pre-order page was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} label="Back to exhibitor" />
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pre-order</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{booth.exhibitorName}</h1>
          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="product">Product</label>
              <select id="product" value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary">
                <option value="">Choose a product</option>
                {booth.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-foreground" htmlFor="quantity">Quantity</label>
                <input id="quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground" htmlFor="phone">Phone number</label>
                <input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+254 799 010 210" className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
              </div>
            </div>
            <div className="rounded-2xl bg-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Estimated total</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-primary">{product ? formatCurrency(total, product.currency) : "Choose product"}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="notes">Notes</label>
              <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Delivery details, configuration, or questions" className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full sm:w-auto">
              {mutation.isPending ? "Sending" : "Send pre-order"}
            </Button>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
