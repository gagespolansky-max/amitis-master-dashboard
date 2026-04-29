"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipContextValue {
  open: boolean
  setOpen: (next: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  id: string
}

const Ctx = React.createContext<TooltipContextValue | null>(null)

function useCtx(component: string): TooltipContextValue {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error(`<${component}> must be inside <Tooltip>`)
  return ctx
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const id = React.useId()
  return (
    <Ctx.Provider value={{ open, setOpen, triggerRef, id }}>
      <span className="relative inline-flex">{children}</span>
    </Ctx.Provider>
  )
}

/**
 * Spreadable trigger props. Typed loosely (`any` ref) because the underlying
 * trigger may be a button, an anchor, or a custom component — the render prop
 * pattern from Base UI deliberately stays element-agnostic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TriggerProps = Record<string, any>

export interface TooltipTriggerProps {
  /**
   * Render-prop API matching Base UI:
   *   <TooltipTrigger render={(p) => <Button {...p} />} />
   * The function receives the props to spread on the underlying element.
   */
  render: (props: TriggerProps) => React.ReactNode
}

export function TooltipTrigger({ render }: TooltipTriggerProps) {
  const ctx = useCtx("TooltipTrigger")
  const props: TriggerProps = {
    ref: ctx.triggerRef,
    onMouseEnter: () => ctx.setOpen(true),
    onMouseLeave: () => ctx.setOpen(false),
    onFocus: () => ctx.setOpen(true),
    onBlur: () => ctx.setOpen(false),
    "aria-describedby": ctx.open ? ctx.id : undefined,
  }
  return <>{render(props)}</>
}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number
}

export function TooltipContent({
  className,
  children,
  // sideOffset is accepted for API parity with Base UI but our positioning is
  // hand-rolled (translate-y on the wrapper); we don't compute an offset.
  sideOffset,
  ...rest
}: TooltipContentProps) {
  void sideOffset
  const ctx = useCtx("TooltipContent")
  if (!ctx.open) return null
  return (
    <div
      role="tooltip"
      id={ctx.id}
      className={cn(
        "absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1.5",
        "rounded-md border border-white/10 bg-[#1a1d26] px-2 py-1 text-[11px] text-foreground shadow-md",
        "pointer-events-none whitespace-nowrap",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
