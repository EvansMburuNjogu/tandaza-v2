import { LabelHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        props.className
      )}
    />
  )
}