"use client"

import * as React from "react"

type TriggerProps = React.HTMLAttributes<HTMLElement> & {
  "aria-describedby"?: string
}

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  contentId: string
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const contentId = React.useId()

  return (
    <TooltipContext.Provider value={{ open, setOpen, contentId }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  render,
}: {
  render: (props: TriggerProps) => React.ReactNode
}) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) return render({})

  return (
    <>
      {render({
        onMouseEnter: () => ctx.setOpen(true),
        onMouseLeave: () => ctx.setOpen(false),
        onFocus: () => ctx.setOpen(true),
        onBlur: () => ctx.setOpen(false),
        "aria-describedby": ctx.open ? ctx.contentId : undefined,
      })}
    </>
  )
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx?.open) return null

  return (
    <span
      id={ctx.contentId}
      role="tooltip"
      className="absolute right-0 top-full z-50 mt-2 w-max max-w-64 rounded-md border border-card-border bg-[#11131b] px-2 py-1 text-[11px] leading-snug text-foreground shadow-xl"
    >
      {children}
    </span>
  )
}
