"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"

export default function ExpoWorkspaceError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Expo workspace render failed", error)
  }, [error])

  return (
    <div className="space-y-6">
      <BackLink href="/exhibitor/my-expos" label="Back to My Expos" />
      <Card className="mx-auto max-w-2xl border-border/80 p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
          !
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">Could not open this expo workspace</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
          Some workspace data is still being prepared. Refresh the page, or return to your expo list and open it again.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Button type="button" variant="secondary" onClick={() => window.location.assign("/exhibitor/my-expos")}>
            My Expos
          </Button>
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        </div>
      </Card>
    </div>
  )
}
