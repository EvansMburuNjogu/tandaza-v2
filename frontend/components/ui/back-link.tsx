import Link from "next/link"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { buttonClasses } from "@/components/ui/button"

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant: "secondary", size: "md" })}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  )
}
