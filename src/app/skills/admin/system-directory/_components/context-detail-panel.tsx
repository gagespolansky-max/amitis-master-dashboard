"use client"

import { useState, useEffect } from "react"
import type { ContextNode } from "./context-tree-node"

interface ContextDetailPanelProps {
  node: ContextNode | null
  onSwitchToDirectory?: (entryName: string) => void
}

export default function ContextDetailPanel({
  node,
  onSwitchToDirectory,
}: ContextDetailPanelProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!node) {
      setContent(null)
      return
    }
    setLoading(true)
    fetch(`/skills/admin/system-directory/api/content?path=${encodeURIComponent(node.filePath)}`)
      .then((res) => (res.ok ? res.json() : { content: "Failed to load file" }))
      .then((data) => {
        setContent(data.content)
        setLoading(false)
      })
      .catch(() => {
        setContent("Failed to load file")
        setLoading(false)
      })
  }, [node?.filePath])

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Select a CLAUDE.md file to view its contents
      </div>
    )
  }

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="font-mono text-sm font-semibold mb-1">{node.shortPath}</div>
      <div className="text-[10px] text-muted mb-4 font-mono break-all">{node.filePath}</div>

      {node.children.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Child CLAUDE.md files
          </div>
          <div className="space-y-1">
            {node.children.map((child) => (
              <div key={child.filePath} className="text-xs text-accent-hover font-mono">
                {child.shortPath}
              </div>
            ))}
          </div>
        </div>
      )}

      {node.agents.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Agents
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.agents.map((name) => (
              <button
                key={name}
                onClick={() => onSwitchToDirectory?.(name)}
                className="text-xs bg-accent/10 border border-accent/30 text-accent-hover px-2 py-1 rounded cursor-pointer hover:opacity-80"
              >
                /{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {node.skills.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.skills.map((name) => (
              <button
                key={name}
                onClick={() => onSwitchToDirectory?.(name)}
                className="text-xs bg-warning/10 border border-warning/30 text-warning px-2 py-1 rounded cursor-pointer hover:opacity-80"
              >
                /{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {node.rules.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Rules
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.rules.map((name) => (
              <code key={name} className="text-xs bg-background px-1.5 py-0.5 rounded border border-card-border">
                {name}
              </code>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-card-border">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Content</div>
        {loading ? (
          <div className="text-xs text-muted">Loading...</div>
        ) : (
          <pre className="text-xs font-mono text-foreground/80 bg-background border border-card-border rounded-lg p-3 overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
