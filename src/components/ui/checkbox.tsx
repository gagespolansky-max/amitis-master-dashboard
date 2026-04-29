import * as React from "react"
import { cn } from "@/lib/utils"

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      className={cn(
        "h-4 w-4 rounded border border-card-border bg-background accent-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        className,
      )}
      {...props}
    />
  )
}
