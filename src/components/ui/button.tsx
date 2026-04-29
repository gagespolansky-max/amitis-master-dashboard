import * as React from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "default" | "secondary" | "outline" | "ghost"
type ButtonSize = "default" | "sm" | "icon-sm" | "icon-xs"

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-accent text-white hover:bg-accent-hover border-transparent",
  secondary: "bg-white/10 text-foreground hover:bg-white/15 border-white/10",
  outline: "border-card-border bg-transparent text-foreground hover:bg-white/5 hover:border-white/20",
  ghost: "border-transparent bg-transparent text-foreground hover:bg-white/5",
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-3 text-sm",
  sm: "h-8 px-2.5 text-xs",
  "icon-sm": "h-8 w-8 p-0",
  "icon-xs": "h-6 w-6 p-0",
}

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5",
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  ),
)
Button.displayName = "Button"
