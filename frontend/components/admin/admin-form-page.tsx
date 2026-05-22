"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"

export function AdminFormPage({
  title,
  description,
  backHref,
  submitLabel,
  submitting,
  onSubmit,
  children
}: {
  title: string
  description: string
  backHref: string
  submitLabel: string
  submitting?: boolean
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  function handleInvalid(event: React.InvalidEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    const label = field.closest("div")?.querySelector("label")?.textContent?.trim()
    const message = field.validationMessage || "Check this field and try again."
    toast.error(label ? `Check ${label}` : "Check the form", { description: message })
    field.focus()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={<BackLink href={backHref} label="Back" />}
      />

      <Card className="relative overflow-hidden border-border/60 bg-card/86 shadow-card backdrop-blur-xl">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-36 rounded-bl-[3rem] bg-primary/[0.04]" />
        <form className="relative space-y-6 p-6" onSubmit={onSubmit} onInvalid={handleInvalid}>
          {children}
          <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-5">
            <Link href={backHref} className="inline-flex items-center rounded-2xl border border-border/70 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-elevated focus:outline-none focus:ring-4 focus:ring-primary/10">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-px hover:shadow-float focus:outline-none focus:ring-4 focus:ring-primary/20 active:translate-y-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
