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
  interest: "Interested",
  meeting: "Meeting",
  pre_order: "Pre-order"
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
          <p className="mt-1 text-sm text-muted">{exhibitor.products.length} products</p>
        </div>
      </div>
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
  const settingsQuery = useQuery({
    queryKey: ["visitor-settings"],
    queryFn: () => api.getVisitorSettings(token || ""),
    enabled: sessionReady
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
  const selectedProducts = selectedExhibitor?.products || []
  const selectedProduct = selectedExhibitor?.products.find((product) => product.id === selectedProductId)
  const selectedConversation = conversationsQuery.data?.find((thread) => thread.exhibitorId === selectedExhibitor?.exhibitorId)

  useEffect(() => {
    if (phone || !settingsQuery.data?.phone) return
    setPhone(settingsQuery.data.phone)
  }, [phone, settingsQuery.data?.phone])

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
    if ((action === "meeting" || action === "pre_order") && !phone.trim()) {
      toast.error("Add your phone number so the exhibitor can follow up")
      return
    }

    actionMutation.mutate({
      boothId: exhibitor.id,
      action,
      name: user?.name,
      email: user?.email,
      phone: phone.trim(),
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
        <p className="text-sm font-medium text-muted">Loading expo...</p>
      </div>
    )
  }

  if (error || !data) return <ErrorState title="Failed to load expo details" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="space-y-6">
        <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.1),transparent_34%),linear-gradient(135deg,#ffffff,#faf8ff_62%,#f8fafc)] shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="p-5 sm:p-6">
              <Link href="/visitor/expos" className="text-sm font-medium text-primary hover:underline">Back to expos</Link>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{data.category}</span>
                <span className="rounded-full bg-elevated px-3 py-1">{formatDate(data.startDate)} - {formatDate(data.endDate)}</span>
                <span className="rounded-full bg-elevated px-3 py-1">{data.venue}</span>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground lg:text-[2rem]">{data.name}</h1>
              {data.description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{data.description}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-2xl bg-white/75 px-4 py-3 shadow-sm ring-1 ring-white/80">
                  <p className="text-xs font-medium text-muted">Exhibitors</p>
                  <p className="mt-1 text-xl font-semibold text-primary">{exhibitors.length.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-white/75 px-4 py-3 shadow-sm ring-1 ring-white/80">
                  <p className="text-xs font-medium text-muted">Products</p>
                  <p className="mt-1 text-xl font-semibold text-primary">
                    {exhibitors.reduce((total, exhibitor) => total + exhibitor.products.length, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="min-h-56 bg-elevated lg:min-h-full">
              {data.bannerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.bannerImage} alt={data.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-56 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_32%),linear-gradient(135deg,#fafafa,#f6f2ff)] px-8 text-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Remote access</p>
                    <p className="mt-3 text-lg font-semibold text-foreground">Open exhibitors anywhere</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Exhibitors</h2>
                  <p className="mt-1 text-sm text-muted">Choose one to view products and interact.</p>
                </div>
                <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted">
                  {exhibitors.length.toLocaleString()} exhibitors
                </span>
              </div>
              {exhibitors.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  Exhibitors will appear here when they activate.
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
              {!selectedExhibitor || selectedProducts.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  Product catalog is not available yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedProducts.map((product) => (
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

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Action</h2>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["interest", "meeting", "pre_order"] as VisibleVisitorAction[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={action === item}
                    onClick={() => setAction(item)}
                    className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                      action === item ? "bg-primary text-white shadow-sm" : "bg-elevated text-muted hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {actionLabels[item]}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <label className="block text-xs font-semibold uppercase text-muted" htmlFor="visitor-phone">Phone number</label>
                <input
                  id="visitor-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 799 010 210"
                  className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm outline-none focus:border-primary"
                />
                {action === "meeting" && (
                  <>
                    <label className="block text-xs font-semibold uppercase text-muted" htmlFor="meeting-time">Meeting date and time</label>
                    <input
                      id="meeting-time"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="h-11 w-full rounded-xl border border-border/80 bg-elevated px-3 text-sm outline-none focus:border-primary"
                    />
                  </>
                )}
                <label className="block text-xs font-semibold uppercase text-muted" htmlFor="visitor-notes">Notes</label>
                <textarea
                  id="visitor-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note"
                  rows={4}
                  className="w-full rounded-xl border border-border/80 bg-elevated px-3 py-3 text-sm outline-none focus:border-primary"
                />
                <div className="rounded-2xl border border-border/70 bg-elevated p-3 text-sm">
                  <p className="text-xs font-semibold uppercase text-muted">Selected exhibitor</p>
                  <p className="mt-1 font-medium text-foreground">{selectedExhibitor?.exhibitorName || "No exhibitor selected"}</p>
                  {selectedProduct ? (
                    <div className="mt-3 rounded-xl bg-card p-3">
                      <p className="text-xs font-semibold uppercase text-muted">Selected product</p>
                      <p className="mt-1 font-medium text-foreground">{selectedProduct.name}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-primary">
                        {formatCurrency(selectedProduct.discountedPrice && selectedProduct.discountedPrice < selectedProduct.price ? selectedProduct.discountedPrice : selectedProduct.price, selectedProduct.currency)}
                      </p>
                    </div>
                  ) : action === "pre_order" ? (
                    <p className="mt-3 text-xs leading-5 text-muted">Choose a product first.</p>
                  ) : null}
                </div>
                <Button onClick={submitAction} disabled={actionMutation.isPending || !selectedExhibitor} className="w-full">
                  {actionMutation.isPending ? "Sending..." : actionLabels[action]}
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold">Chat</h2>
              <p className="mt-1 text-sm text-muted">{selectedExhibitor?.exhibitorName || "Choose an exhibitor"}</p>
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
          </aside>
        </div>
      </div>
    </SessionGuard>
  )
}
