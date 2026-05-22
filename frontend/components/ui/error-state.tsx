"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function ErrorState({
  title = "Something went wrong",
  message = "The data could not be loaded. This may be a temporary issue.",
  onRetry
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  useEffect(() => {
    toast.error(title, { description: message })
  }, [message, title])

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-elevated"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 4v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Try again
        </button>
      )}
    </div>
  )
}
