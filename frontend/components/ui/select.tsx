import { SelectHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-ring/10",
        className
      )}
    >
      {children}
    </select>
  )
}

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<"div"> & { children?: ReactNode }) {
  return (
    <div className={cn(
      "w-full rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary/70 focus:outline-none focus:ring-4 focus:ring-ring/10 flex items-center justify-between cursor-pointer",
      className
    )} {...props}>
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-slate-400">{placeholder}</span>
}

export function SelectContent({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children?: ReactNode }) {
  return <option value={value}>{children}</option>
}