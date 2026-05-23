import Link from "next/link"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { buttonClasses } from "@/components/ui/button"

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={buttonClasses({ variant: "secondary", size: "icon", className: "rounded-full" })}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Link>
  )
}
