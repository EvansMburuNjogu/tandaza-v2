import { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-slate-400/90 focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-ring/10",
        props.className
      )}
    />
  )
}
