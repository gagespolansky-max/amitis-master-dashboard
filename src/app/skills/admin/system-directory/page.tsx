"use client"

import { useState } from "react"
import PageHeader from "@/components/page-header"
import SystemDirectoryView from "./_components/system-directory-view"
import ContextTreeView from "./_components/context-tree-view"

export default function SystemDirectoryPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "context-tree">("directory")
  const [directorySelection, setDirectorySelection] = useState<string | null>(null)

  function handleSwitchToDirectory(entryName: string) {
    setDirectorySelection(entryName)
    setActiveTab("directory")
  }

  return (
    <div>
      <PageHeader
        title="System Directory"
        description="All agents and skills installed on this machine"
        status="active"
      />

      {/* Tab bar */}
      <div className="flex gap-6 mb-6 border-b border-card-border">
        <button
          onClick={() => setActiveTab("directory")}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "directory"
              ? "text-foreground border-b-2 border-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Directory
        </button>
        <button
          onClick={() => setActiveTab("context-tree")}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "context-tree"
              ? "text-foreground border-b-2 border-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Context Tree
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "directory" ? (
        <SystemDirectoryView initialSelection={directorySelection} />
      ) : (
        <ContextTreeView onSwitchToDirectory={handleSwitchToDirectory} />
      )}
    </div>
  )
}
