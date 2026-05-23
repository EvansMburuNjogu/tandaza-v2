"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
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

export default function VisitorFeedbackPage() {
  const params = useParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const sessionReady = Boolean(token && user?.role === "visitor")

  const { data, isLoading, error } = useQuery({
    queryKey: ["visitor-expo-details", expoId],
    queryFn: () => api.getVisitorExpoDetails(token || "", expoId),
    enabled: sessionReady && Boolean(expoId)
  })
  const booth = findVisitorBooth(data, exhibitorId)

  const mutation = useMutation({
    mutationFn: () => {
      if (!booth) throw new Error("Exhibitor not found")
      if (comment.trim().length < 3) throw new Error("Add a short comment")
      return api.submitFeedback(token || "", expoId, rating, comment.trim(), booth.exhibitorId)
    },
    onSuccess: () => {
      setComment("")
      setRating(5)
      toast.success("Feedback shared")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit feedback")
  })

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading feedback...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth) return <ErrorState title="Feedback page was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} className="text-sm font-semibold text-primary hover:underline">Back to exhibitor</Link>
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Feedback</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{booth.exhibitorName}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Share what helped and what could be improved.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-foreground" htmlFor="rating">Rating</label>
            <select id="rating" value={rating} onChange={(event) => setRating(Number(event.target.value))} className="h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary">
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
            </select>
            <label className="block text-sm font-semibold text-foreground" htmlFor="comment">Comment</label>
            <textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} rows={5} placeholder="What stood out?" className="w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full sm:w-auto">
              {mutation.isPending ? "Sending" : "Submit feedback"}
            </Button>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
