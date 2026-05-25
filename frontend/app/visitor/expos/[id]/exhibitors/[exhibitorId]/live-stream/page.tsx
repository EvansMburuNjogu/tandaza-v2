"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { api } from "@/lib/api"
import { latestIncomingConversationMessages, notifyIncomingConversationMessage } from "@/lib/conversation-notifications"
import { useSessionStore } from "@/store/session-store"
import { findVisitorBooth } from "@/lib/visitor-expo"
import { formatDate } from "@/lib/utils"

export default function VisitorLiveStreamPage() {
  const params = useParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")
  const seenConversationMessageIds = useRef<Set<string>>(new Set())
  const conversationNotificationsReady = useRef(false)
  const sessionReady = Boolean(token && user?.role === "visitor")
  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })
  const booth = findVisitorBooth(data, exhibitorId)
  const liveStream = booth?.liveStream
  const liveChatEnabled = Boolean(liveStream?.enabled && liveStream.liveChatEnabled)
  const conversationsQuery = useQuery({
    queryKey: ["visitor-expo-conversations", expoId],
    queryFn: () => api.getVisitorExpoConversations(token || "", expoId),
    enabled: sessionReady && Boolean(expoId) && liveChatEnabled,
    refetchInterval: liveChatEnabled ? 5000 : false
  })
  const thread = useMemo(() => conversationsQuery.data?.find((item) => item.exhibitorId === booth?.exhibitorId), [booth?.exhibitorId, conversationsQuery.data])
  const messages = thread?.messages || []

  useEffect(() => {
    const incoming = latestIncomingConversationMessages(thread ? [thread] : [], "exhibitor")
    if (!incoming.length) return
    if (!conversationNotificationsReady.current) {
      incoming.forEach(({ messageId }) => seenConversationMessageIds.current.add(messageId))
      conversationNotificationsReady.current = true
      return
    }
    incoming.forEach(({ thread: incomingThread, messageId }) => {
      if (seenConversationMessageIds.current.has(messageId)) return
      seenConversationMessageIds.current.add(messageId)
      notifyIncomingConversationMessage(incomingThread)
    })
  }, [thread])

  const chatMutation = useMutation({
    mutationFn: () => {
      if (!booth) throw new Error("Exhibitor not found")
      if (!liveChatEnabled) throw new Error("Live chat is not enabled for this stream.")
      if (message.trim().length < 2) throw new Error("Write a message first.")
      return api.sendVisitorExpoChatMessage(token || "", expoId, booth.exhibitorId, { message: message.trim() })
    },
    onSuccess: () => {
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["visitor-expo-conversations", expoId] })
      toast.success("Message sent.")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send message.")
  })

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading live stream...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth) return <ErrorState title="Live stream was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="mx-auto w-full max-w-6xl space-y-4 overflow-hidden">
        <BackLink href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} label="Back to exhibitor" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="overflow-hidden">
            {liveStream?.enabled && liveStream.embedUrl ? (
              <iframe
                title={liveStream.title || `${booth.exhibitorName} live stream`}
                src={liveStream.embedUrl}
                className="aspect-video w-full bg-black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="aspect-video bg-[linear-gradient(135deg,#f6f2ff,#ffffff)]" />
            )}
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live stream</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">{liveStream?.title || booth.exhibitorName}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                {liveStream?.enabled ? `Watching ${booth.exhibitorName} live from ${data.name}.` : "No live stream has been published for this exhibitor yet."}
              </p>
            </div>
          </Card>

          <Card className="flex min-h-[30rem] flex-col overflow-hidden">
            <div className="border-b border-border/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live chat</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{booth.exhibitorName}</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                {liveChatEnabled ? "Ask questions while the stream is live." : "Live chat is not enabled for this stream."}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-elevated/35 p-4">
              {!liveChatEnabled ? (
                <div className="flex min-h-[18rem] items-center justify-center text-center text-sm text-muted">Chat will appear here when the exhibitor enables it.</div>
              ) : conversationsQuery.isLoading ? (
                <div className="flex min-h-[18rem] items-center justify-center text-center text-sm text-muted">Loading chat...</div>
              ) : messages.length ? messages.map((item) => (
                <div key={item.id} className={`max-w-[88%] break-words rounded-2xl p-3 text-sm ${item.senderRole === "visitor" ? "ml-auto bg-primary text-white" : "border border-border/70 bg-card text-foreground"}`}>
                  <p className="leading-6">{item.message}</p>
                  <p className={`mt-1 text-[11px] ${item.senderRole === "visitor" ? "text-white/70" : "text-muted"}`}>{formatDate(item.createdAt)}</p>
                </div>
              )) : (
                <div className="flex min-h-[18rem] items-center justify-center text-center text-sm text-muted">No messages yet. Start the live conversation.</div>
              )}
            </div>
            <form
              className="border-t border-border/70 p-3"
              onSubmit={(event) => {
                event.preventDefault()
                chatMutation.mutate()
              }}
            >
              <div className="flex min-w-0 items-end gap-2 rounded-2xl border border-border/80 bg-elevated/50 p-2 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                <textarea
                  aria-label="Live chat message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={1}
                  placeholder={liveChatEnabled ? "Write a live message..." : "Live chat disabled"}
                  disabled={!liveChatEnabled}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Button type="submit" disabled={!liveChatEnabled || chatMutation.isPending || message.trim().length < 2} className="h-10 shrink-0">
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
