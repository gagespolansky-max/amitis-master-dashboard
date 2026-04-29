"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.HTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  "aria-label"?: string
  name?: string
  value?: string
}

/**
 * Minimal controlled/uncontrolled checkbox built on a `<button role="checkbox">`.
 * Matches the shadcn-style `onCheckedChange(boolean)` API used at call sites.
 */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(
    { checked, defaultChecked, disabled, onCheckedChange, className, onClick, ...rest },
    ref,
  ) {
    const [internal, setInternal] = React.useState<boolean>(!!defaultChecked)
    const isControlled = checked !== undefined
    const value = isControlled ? checked : internal

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      if (disabled) return
      onClick?.(e)
      if (e.defaultPrevented) return
      const next = !value
      if (!isControlled) setInternal(next)
      onCheckedChange?.(next)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={value}
        data-state={value ? "checked" : "unchecked"}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded border border-white/20 bg-transparent transition-colors",
          "h-4 w-4 text-foreground hover:border-white/40",
          value && "bg-accent/30 border-accent/50",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        {...rest}
      >
        {value && <Check className="h-3 w-3" />}
      </button>
    )
  },
)
