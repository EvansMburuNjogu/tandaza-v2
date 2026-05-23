"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { SessionGuard } from "@/components/auth/session-guard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/ui/back-link"
import { Spinner } from "@/components/ui/spinner"
import { ErrorState } from "@/components/ui/error-state"
import { VisitorPhoneInput, fullPhoneNumber } from "@/components/visitor/phone-input"
import { api } from "@/lib/api"
import { useSessionStore } from "@/store/session-store"
import { findVisitorBooth } from "@/lib/visitor-expo"

export default function VisitorMeetingPage() {
  const params = useParams()
  const expoId = params.id as string
  const exhibitorId = params.exhibitorId as string
  const token = useSessionStore((s) => s.token)
  const user = useSessionStore((s) => s.user)
  const [callingCode, setCallingCode] = useState("+254")
  const [phone, setPhone] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")
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
      if (!scheduledAt) throw new Error("Choose a meeting date and time")
      const visitorPhone = fullPhoneNumber(callingCode, phone)
      if (!visitorPhone) throw new Error("Add your phone number")
      return api.createVisitorExpoAction(token || "", expoId, {
        boothId: booth.id,
        action: "meeting",
        name: user?.name,
        email: user?.email,
        phone: visitorPhone,
        scheduledAt,
        notes: notes.trim() || `Meeting request for ${booth.exhibitorName}`
      })
    },
    onSuccess: () => {
      setNotes("")
      setScheduledAt("")
      toast.success("Meeting request sent")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not request meeting")
  })

  if (!sessionReady) return <SessionGuard allowedRoles={["visitor"]}><div /></SessionGuard>
  if (isLoading) {
    return (
      <SessionGuard allowedRoles={["visitor"]}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-muted">Loading meeting form...</p>
        </div>
      </SessionGuard>
    )
  }
  if (error || !data || !booth) return <ErrorState title="Meeting page was not found" />

  return (
    <SessionGuard allowedRoles={["visitor"]}>
      <div className="mx-auto w-full max-w-2xl space-y-4 overflow-hidden">
        <BackLink href={`/visitor/expos/${expoId}/exhibitors/${booth.id}`} label="Back to exhibitor" />
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Request meeting</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{booth.exhibitorName}</h1>
          <div className="mt-6 grid gap-4">
            <VisitorPhoneInput id="phone" callingCode={callingCode} phone={phone} onCallingCodeChange={setCallingCode} onPhoneChange={setPhone} />
            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="scheduledAt">Date and time</label>
              <input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="notes">Notes</label>
              <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="What would you like to discuss?" className="mt-2 w-full rounded-xl border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none placeholder:text-slate-400 focus:border-primary" />
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full sm:w-auto">
              {mutation.isPending ? "Sending" : "Request meeting"}
            </Button>
          </div>
        </Card>
      </div>
    </SessionGuard>
  )
}
