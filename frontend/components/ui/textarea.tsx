import { TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-slate-400/90 focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-ring/10 resize-none",
        props.className
      )}
    />
  )
}