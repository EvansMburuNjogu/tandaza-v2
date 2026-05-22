import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

const styles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primaryForeground shadow-card hover:-translate-y-[1px] hover:shadow-float active:translate-y-0",
  secondary: "border border-border bg-elevated text-foreground hover:border-primary/20 hover:bg-secondary/90",
  ghost: "bg-transparent text-foreground hover:bg-secondary/80",
  danger: "bg-danger text-white shadow-card hover:-translate-y-[1px] hover:shadow-float active:translate-y-0"
}

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base"
}

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring/35 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
