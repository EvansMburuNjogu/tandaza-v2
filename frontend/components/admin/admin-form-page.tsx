"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { BackLink } from "@/components/ui/back-link"
import { buttonClasses } from "@/components/ui/button"

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
            <Link href={backHref} className={buttonClasses({ variant: "secondary" })}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={buttonClasses({ variant: "primary" })}
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
