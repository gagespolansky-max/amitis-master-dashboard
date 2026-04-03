"use client"

import { useState, useEffect } from "react"
import ContextTreeNode from "./context-tree-node"
import type { ContextNode } from "./context-tree-node"
import ContextDetailPanel from "./context-detail-panel"

interface ContextTreeViewProps {
  onSwitchToDirectory?: (entryName: string) => void
}

export default function ContextTreeView({ onSwitchToDirectory }: ContextTreeViewProps) {
  const [tree, setTree] = useState<ContextNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<ContextNode | null>(null)

  useEffect(() => {
    fetch("/skills/admin/system-directory/api/context-tree")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setTree(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function handleSelect(node: ContextNode) {
    setSelectedNode((prev) =>
      prev?.filePath === node.filePath ? null : node
    )
  }

  function countNodes(nodes: ContextNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Scanning for CLAUDE.md files...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        Error: {error}
      </div>
    )
  }

  const totalFiles = countNodes(tree)

  return (
    <div className="border border-card-border rounded-xl overflow-hidden bg-card-bg">
      <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
        <span className="text-sm font-medium">Context Inheritance Tree</span>
        <span className="text-xs text-muted">{totalFiles} CLAUDE.md files</span>
      </div>

      <div className="flex" style={{ height: "calc(100vh - 220px)" }}>
        <div className="w-[60%] border-r border-card-border p-4 overflow-auto">
          {tree.map((node) => (
            <ContextTreeNode
              key={node.filePath}
              node={node}
              selectedPath={selectedNode?.filePath || null}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="w-[40%] overflow-y-auto">
          <ContextDetailPanel
            node={selectedNode}
            onSwitchToDirectory={onSwitchToDirectory}
          />
        </div>
      </div>
    </div>
  )
}
