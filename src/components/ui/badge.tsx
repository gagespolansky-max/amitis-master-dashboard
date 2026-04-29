import type * as React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "outline"

const variants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-accent/20 text-accent-hover",
  secondary: "border-transparent bg-white/10 text-foreground",
  outline: "border-card-border text-muted",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
