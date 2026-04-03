"use client"

import { useSidebar } from "./sidebar-layout"

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <main
      className="min-h-screen transition-all duration-200"
      style={{ marginLeft: collapsed ? 48 : "var(--sidebar-width)" }}
    >
      <div className="px-8 py-8">
        {children}
      </div>
    </main>
  )
}
