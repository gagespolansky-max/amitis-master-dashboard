import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Lightweight ScrollArea — just a styled scroll container. We don't bring in
 * Radix UI here; the OIG views only need vertical overflow with our usual
 * dark-theme scrollbar.
 */
export function ScrollArea({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-y-auto overflow-x-hidden",
        // Slim scrollbar styling that plays well with the dark theme.
        "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
