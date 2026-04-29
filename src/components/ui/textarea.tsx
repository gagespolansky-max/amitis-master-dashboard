import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...rest}
      />
    )
  },
)
