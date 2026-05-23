"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { findVisitorBooth } from "@/lib/visitor-expo"
import { formatDate } from "@/lib/utils"

export default function VisitorExhibitorChatPage() {
  const params = useParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")
  const sessionReady = Boolean(token && user?.role === "visitor")

  const expoQuery = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })
  const conversationsQuery = useQuery({
    queryKey: ["visitor-expo-conversations", expoId],
    queryFn: () => api.getVisitorExpoConversations(token || "", expoId),
    enabled: sessionReady && Boolean(expoId),
    refetchInterval: 8000
  })

  const booth = findVisitorBooth(expoQuery.data, exhibitorId)
  const thread = useMemo(() => conversationsQuery.data?.find((item) => item.exhibitorId === booth?.exhibitorId), [booth?.exhibitorId, conversationsQuery.data])
  const messages = thread?.messages || []

  const mutation = useMutation({
    mutationFn: () => {
      if (!booth) throw new Error("Exhibitor not found")
      if (!message.trim()) throw new Error("Write a message")
      return api.sendVisitorExpoChatMessage(token || "", expoId, booth.exhibitorId, { message: message.trim() })
    },
    onSuccess: () => {
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["visitor-expo-conversations", expoId] })
      toast.success("Message sent")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send message")
  })

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (expoQuery.isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading chat...</p>
        </div>
      </SessionGuard>
    )
  }
  if (expoQuery.error || !expoQuery.data || !booth) return <ErrorState title="Chat was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} className="text-sm font-semibold text-primary hover:underline">Back to exhibitor</Link>
        <Card className="overflow-hidden">
          <div className="border-b border-border/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Chat</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">{booth.exhibitorName}</h1>
          </div>
          <div className="max-h-[58vh] min-h-[22rem] space-y-3 overflow-y-auto bg-elevated/35 p-4">
            {messages.length ? messages.map((item) => (
              <div key={item.id} className={`max-w-[86%] rounded-2xl p-3 text-sm ${item.senderRole === "visitor" ? "ml-auto bg-primary text-white" : "border border-border/70 bg-card text-foreground"}`}>
                <p className="leading-6">{item.message}</p>
                <p className={`mt-1 text-[11px] ${item.senderRole === "visitor" ? "text-white/70" : "text-muted"}`}>{formatDate(item.createdAt)}</p>
              </div>
            )) : (
              <div className="flex min-h-[18rem] items-center justify-center text-center text-sm text-muted">No messages yet. Start the conversation.</div>
            )}
          </div>
          <form
            className="border-t border-border/70 p-3"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-elevated/50 p-2 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                aria-label="Message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={1}
                placeholder="Write a message..."
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-slate-400"
              />
              <Button type="submit" disabled={mutation.isPending || !message.trim()} className="h-10 shrink-0">
                {mutation.isPending ? "Sending" : "Send"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </SessionGuard>
  )
}
