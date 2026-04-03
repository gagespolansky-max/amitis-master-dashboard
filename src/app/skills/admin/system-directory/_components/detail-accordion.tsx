"use client"

import { useState } from "react"

interface DetailAccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function DetailAccordion({
  title,
  children,
  defaultOpen = false,
}: DetailAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-card-border">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-3 text-sm font-medium text-foreground hover:text-accent-hover transition-colors"
      >
        {title}
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}
