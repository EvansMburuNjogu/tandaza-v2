import Link from "next/link"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-elevated"
      )}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  )
}
