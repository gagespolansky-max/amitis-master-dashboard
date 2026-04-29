import * as React from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive"
type ButtonSize = "default" | "sm" | "icon-sm" | "icon-xs"

export interface ButtonVariantArgs {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0"

const VARIANTS: Record<ButtonVariant, string> = {
  default:
    "bg-foreground/10 text-foreground border border-foreground/15 hover:bg-foreground/15",
  outline:
    "border border-white/10 bg-transparent text-foreground hover:bg-white/[0.04] hover:border-white/20",
  ghost:
    "bg-transparent text-foreground hover:bg-white/[0.04]",
  secondary:
    "bg-accent/15 text-accent border border-accent/25 hover:bg-accent/20",
  destructive:
    "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/20",
}

const SIZES: Record<ButtonSize, string> = {
  default: "h-9 px-3.5 text-sm",
  sm: "h-7 px-2.5 text-[12px]",
  "icon-sm": "h-7 w-7 p-0",
  "icon-xs": "h-6 w-6 p-0 [&_svg]:size-3",
}

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: ButtonVariantArgs = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className)
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant, size, className, type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={buttonVariants({ variant, size, className })}
        {...rest}
      />
    )
  },
)
