import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "outline" | "secondary" | "destructive"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-accent/20 text-accent border-accent/30",
  outline: "bg-transparent text-foreground/80 border-white/15",
  secondary: "bg-foreground/10 text-foreground border-foreground/15",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
}

export function Badge({ variant = "default", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  )
}
