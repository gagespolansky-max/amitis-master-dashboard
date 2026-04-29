import * as React from "react"
import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-foreground/[0.07]",
        className,
      )}
      {...rest}
    />
  )
}
