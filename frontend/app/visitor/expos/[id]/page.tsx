"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { Product, VisitorBooth, VisitorExpoActionPayload } from "@/lib/api/contracts"
import { useSessionStore } from "@/store/session-store"
import { formatCurrency, formatDate } from "@/lib/utils"

type VisitorAction = VisitorExpoActionPayload["action"]
type VisibleVisitorAction = Exclude<VisitorAction, "visit">

const actionLabels: Record<VisibleVisitorAction, string> = {
  interest: "Share interest",
  meeting: "Request meeting",
  pre_order: "Pre-order intent"
}

function ExhibitorCard({
  exhibitor,
  active,
  onSelect
}: {
  exhibitor: VisitorBooth
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border/70 bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{exhibitor.exhibitorName}</p>
          <p className="mt-1 text-sm text-muted">Expo workspace</p>
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-muted">{exhibitor.products.length} products</p>
    </button>
  )
}

function ProductCard({
  product,
  active,
  onSelect
}: {
  product: Product
  active: boolean
  onSelect: () => void
}) {
  const price = product.discountedPrice && product.discountedPrice < product.price ? product.discountedPrice : product.price

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border/70 bg-card hover:border-primary/30"
      }`}
    >
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-elevated">
        {product.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.mediaUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-muted">{product.category}</div>
        )}
      </div>
      <p className="mt-3 font-semibold text-foreground">{product.name}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>
      <p className="mt-3 font-mono text-sm font-semibold text-primary">{formatCurrency(price, product.currency)}</p>
    </button>
  )
}

export default function VisitorExpoDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const expoId = params.id as string
  const exhibitorFromQr = searchParams.get("exhibitor") || ""
  const [selectedExhibitorId, setSelectedExhibitorId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [action, setAction] = useState<VisibleVisitorAction>("interest")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [chatMessage, setChatMessage] = useState("")
  const sessionReady = Boolean(token && user?.role === "visitor")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })

  const exhibitors = data?.booths || []
  const conversationsQuery = useQuery({
    queryKey: ["visitor-expo-conversations", expoId],
    queryFn: () => api.getVisitorExpoConversations(token || "", expoId),
    enabled: sessionReady && Boolean(expoId),
    refetchInterval: 15000
  })
  useEffect(() => {
    if (!exhibitorFromQr || selectedExhibitorId || !exhibitors.length) return
    if (exhibitors.some((exhibitor) => exhibitor.id === exhibitorFromQr)) {
      setSelectedExhibitorId(exhibitorFromQr)
    }
  }, [exhibitorFromQr, exhibitors, selectedExhibitorId])
  const selectedExhibitor = useMemo(() => {
    if (!exhibitors.length) return undefined
    return exhibitors.find((exhibitor) => exhibitor.id === selectedExhibitorId) || exhibitors[0]
  }, [exhibitors, selectedExhibitorId])
  const selectedProduct = selectedExhibitor?.products.find((product) => product.id === selectedProductId)
  const selectedConversation = conversationsQuery.data?.find((thread) => thread.exhibitorId === selectedExhibitor?.exhibitorId)

  useEffect(() => {
    if (!selectedConversation?.id) return
    let socket: WebSocket | null = null
    let cancelled = false
    fetch("/api/auth/realtime-token", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled || !payload?.token) return
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin
        const wsBase = base.replace(/^https:/, "wss:").replace(/^http:/, "ws:")
        socket = new WebSocket(`${wsBase}/api/v1/visitor/expos/${encodeURIComponent(expoId)}/conversations/ws?thread=${encodeURIComponent(selectedConversation.id)}&token=${encodeURIComponent(payload.token)}`)
        socket.onmessage = () => queryClient.invalidateQueries({ queryKey: ["visitor-expo-conversations", expoId] })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      socket?.close()
    }
  }, [expoId, queryClient, selectedConversation?.id])

  useEffect(() => {
    if (!sessionReady || !selectedExhibitor || !expoId || !token) return
    if (exhibitorFromQr && selectedExhibitor.id !== exhibitorFromQr) return
    const visitKey = `tandaza_visitor_exhibit_visit_${expoId}_${selectedExhibitor.id}_${user?.id || user?.email || "visitor"}`
    if (window.sessionStorage.getItem(visitKey)) return
    window.sessionStorage.setItem(visitKey, "1")
    api.createVisitorExpoAction(token, expoId, {
      boothId: selectedExhibitor.id,
      action: "visit",
      name: user?.name,
      email: user?.email,
      source: exhibitorFromQr ? "booth_qr" : "remote_visit",
      notes: exhibitorFromQr ? "Opened exhibitor profile from QR code." : "Opened exhibitor profile remotely."
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["visitor-timeline"] })
        queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
      })
      .catch(() => {
        window.sessionStorage.removeItem(visitKey)
      })
  }, [exhibitorFromQr, expoId, queryClient, selectedExhibitor, sessionReady, token, user?.email, user?.id, user?.name])

  const actionMutation = useMutation({
    mutationFn: (payload: VisitorExpoActionPayload) => api.createVisitorExpoAction(token || "", expoId, payload),
    onSuccess: () => {
      toast.success(action === "meeting" ? "Meeting request sent" : action === "pre_order" ? "Pre-order interest sent" : "Interest shared")
      setNotes("")
      setScheduledAt("")
      queryClient.invalidateQueries({ queryKey: ["visitor-timeline"] })
      queryClient.invalidateQueries({ queryKey: ["visitor-dashboard"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send visitor action")
  })

  const chatMutation = useMutation({
    mutationFn: () => {
      if (!selectedExhibitor) throw new Error("Choose an exhibitor")
      if (chatMessage.trim().length < 1) throw new Error("Write a message")
      return api.sendVisitorExpoChatMessage(token || "", expoId, selectedExhibitor.exhibitorId, { message: chatMessage.trim() })
    },
    onSuccess: () => {
      setChatMessage("")
      queryClient.invalidateQueries({ queryKey: ["visitor-expo-conversations", expoId] })
      toast.success("Message sent")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send chat")
  })

  function submitAction() {
    const exhibitor = selectedExhibitor
    if (!exhibitor) {
      toast.error("Choose an exhibitor")
      return
    }
    if (action === "pre_order" && !selectedProduct) {
      toast.error("Choose a product for pre-order interest")
      return
    }
    if (action === "meeting" && !scheduledAt) {
      toast.error("Choose a meeting date and time")
      return
    }

    actionMutation.mutate({
      boothId: exhibitor.id,
      action,
      name: user?.name,
      email: user?.email,
      phone,
      notes: notes.trim() || `${actionLabels[action]} for ${exhibitor.exhibitorName}`,
      productId: selectedProduct?.id,
      productName: selectedProduct?.name,
      quantity: action === "pre_order" ? 1 : undefined,
      scheduledAt
    })
  }

  if (!sessionReady) {
    return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-muted">Loading expo workspace...</p>
      </div>
    )
  }

  if (error || !data) return <ErrorState title="Failed to load expo details" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/visitor/expos" className="text-sm font-medium text-primary hover:underline">Back to expos</Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground lg:text-[1.85rem]">{data.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{data.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
              <span className="rounded-full bg-elevated px-3 py-1">{data.category}</span>
              <span className="rounded-full bg-elevated px-3 py-1">{formatDate(data.startDate)} - {formatDate(data.endDate)}</span>
              <span className="rounded-full bg-elevated px-3 py-1">{data.venue}</span>
            </div>
          </div>
          <Card className="p-4 lg:min-w-[18rem]">
            <p className="text-xs font-semibold uppercase text-muted">Remote access</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{exhibitors.length}</p>
            <p className="text-sm text-muted">active exhibitor workspaces</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Exhibitor Workspaces</h2>
                  <p className="mt-1 text-sm text-muted">Open an exhibitor workspace to view products and take action.</p>
                </div>
                <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted">
                  {exhibitors.length.toLocaleString()} exhibitors
                </span>
              </div>
              {exhibitors.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  Active exhibitor workspaces will appear when exhibitors activate their digital workspace.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {exhibitors.map((exhibitor) => (
                    <ExhibitorCard
                      key={exhibitor.id}
                      exhibitor={exhibitor}
                      active={selectedExhibitor?.id === exhibitor.id}
                      onSelect={() => {
                        setSelectedExhibitorId(exhibitor.id)
                        setSelectedProductId("")
                      }}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold">Products</h2>
              <p className="mt-1 text-sm text-muted">{selectedExhibitor ? selectedExhibitor.exhibitorName : "Choose an exhibitor"} catalog</p>
              {!selectedExhibitor || selectedExhibitor.products.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  Product catalog is not available yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedExhibitor.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      active={selectedProductId === product.id}
                      onSelect={() => setSelectedProductId(product.id)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="h-fit p-5">
            <h2 className="text-lg font-semibold">Visitor Action</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["interest", "meeting", "pre_order"] as VisibleVisitorAction[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAction(item)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                    action === item ? "bg-primary text-white" : "bg-elevated text-muted hover:bg-elevated/80"
                  }`}
                >
                  {actionLabels[item]}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <input
                aria-label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm outline-none focus:border-primary"
              />
              {action === "meeting" && (
                <input
                  aria-label="Meeting date and time"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm outline-none focus:border-primary"
                />
              )}
              <textarea
                aria-label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the exhibitor"
                rows={4}
                className="w-full rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm outline-none focus:border-primary"
              />
              <div className="rounded-xl bg-elevated p-3 text-sm text-muted">
                <p className="font-medium text-foreground">{selectedExhibitor?.exhibitorName || "No exhibitor selected"}</p>
                {selectedProduct && <p className="mt-1">{selectedProduct.name}</p>}
              </div>
              <Button onClick={submitAction} disabled={actionMutation.isPending || !selectedExhibitor} className="w-full">
                {actionMutation.isPending ? "Sending..." : actionLabels[action]}
              </Button>
            </div>
          </Card>

          <Card className="h-fit p-5">
            <h2 className="text-lg font-semibold">Chat with exhibitor</h2>
            <p className="mt-1 text-sm text-muted">Send a realtime message to {selectedExhibitor?.exhibitorName || "the selected exhibitor"}.</p>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-elevated/40 p-3">
              {selectedConversation?.messages?.length ? selectedConversation.messages.map((message) => (
                <div key={message.id} className={`max-w-[86%] rounded-2xl p-3 text-sm ${message.senderRole === "visitor" ? "ml-auto bg-primary text-white" : "border border-border/70 bg-card text-foreground"}`}>
                  <p className="leading-6">{message.message}</p>
                  <p className={`mt-1 text-[11px] ${message.senderRole === "visitor" ? "text-white/60" : "text-muted"}`}>{formatDate(message.createdAt)}</p>
                </div>
              )) : (
                <div className="py-8 text-center text-sm text-muted">No chat yet. Say hi to start the conversation.</div>
              )}
            </div>
            <form
              className="mt-3"
              onSubmit={(event) => {
                event.preventDefault()
                chatMutation.mutate()
              }}
            >
              <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-elevated/50 p-2 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                <textarea
                  aria-label="Chat message"
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      chatMutation.mutate()
                    }
                  }}
                  rows={1}
                  placeholder="Write a message..."
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-slate-400"
                />
                <Button type="submit" size="sm" className="h-10 shrink-0 rounded-xl px-4" disabled={chatMutation.isPending || !selectedExhibitor || chatMessage.trim().length < 1}>
                  {chatMutation.isPending ? "Sending" : "Send"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </SessionGuard>
  )
}
