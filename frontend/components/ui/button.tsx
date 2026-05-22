import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft" | "danger"
export type ButtonSize = "sm" | "md" | "lg" | "icon"

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-55"

const styles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primaryForeground shadow-card hover:-translate-y-px hover:bg-primary/95 hover:shadow-float active:translate-y-0",
  secondary: "border border-border/75 bg-card text-foreground shadow-sm hover:border-primary/25 hover:bg-elevated",
  outline: "border border-border/75 bg-transparent text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
  ghost: "bg-transparent text-slate-600 hover:bg-elevated hover:text-foreground",
  soft: "border border-primary/15 bg-primary/8 text-primary hover:border-primary/25 hover:bg-primary/12",
  danger: "bg-danger text-white shadow-card hover:-translate-y-px hover:bg-danger/90 hover:shadow-float active:translate-y-0"
}

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
  icon: "h-10 w-10 p-0"
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(base, styles[variant], sizes[size], className)
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
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  )
}
