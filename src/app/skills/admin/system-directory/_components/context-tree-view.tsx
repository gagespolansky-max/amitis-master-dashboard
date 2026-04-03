"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ContextTreeNode from "./context-tree-node"
import type { ContextNode } from "./context-tree-node"
import ContextListNode from "./context-list-node"
import ContextDetailPanel from "./context-detail-panel"

interface ContextTreeViewProps {
  onSwitchToDirectory?: (entryName: string) => void
}

export default function ContextTreeView({ onSwitchToDirectory }: ContextTreeViewProps) {
  const [tree, setTree] = useState<ContextNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<ContextNode | null>(null)
  const [viewMode, setViewMode] = useState<"chart" | "list">("chart")
  const [dataSource, setDataSource] = useState<"local" | "cache" | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.75)
  const [pan, setPan] = useState({ x: 40, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [didDrag, setDidDrag] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const [panelWidth, setPanelWidth] = useState(35)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({ x: 0, startWidth: 35 })

  useEffect(() => {
    fetch("/skills/admin/system-directory/api/context-tree")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setTree(data.tree)
        setDataSource(data.source)
        setLastSynced(data.updatedAt)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function handleSelect(node: ContextNode) {
    if (didDrag) return
    setSelectedNode((prev) =>
      prev?.filePath === node.filePath ? null : node
    )
  }

  function countNodes(nodes: ContextNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      setZoom((z) => Math.min(2, Math.max(0.15, z + delta)))
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }))
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDidDrag(false)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setDidDrag(true)
    }
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setTimeout(() => setDidDrag(false), 0)
  }, [])

  function resetView() {
    setZoom(0.75)
    setPan({ x: 40, y: 20 })
  }

  // Resize handle for detail panel
  useEffect(() => {
    if (!isResizing) return
    function onMouseMove(e: MouseEvent) {
      const container = document.getElementById("context-tree-container")
      if (!container) return
      const rect = container.getBoundingClientRect()
      const pct = ((rect.right - e.clientX) / rect.width) * 100
      setPanelWidth(Math.min(60, Math.max(20, pct)))
    }
    function onMouseUp() {
      setIsResizing(false)
    }
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
    return () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
  }, [isResizing])

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
      {/* Header */}
      <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Context Inheritance Tree</span>
          <span className="text-xs text-muted">{totalFiles} files</span>
          {dataSource === "cache" && lastSynced && (
            <span className="text-[10px] text-muted/60">
              Last synced: {new Date(lastSynced).toLocaleDateString()} {new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-md border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setViewMode("chart")}
              className={`text-[10px] px-2.5 py-1 transition-colors ${
                viewMode === "chart"
                  ? "bg-accent/20 text-accent-hover"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`text-[10px] px-2.5 py-1 border-l border-white/[0.08] transition-colors ${
                viewMode === "list"
                  ? "bg-accent/20 text-accent-hover"
                  : "text-muted hover:text-foreground"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Zoom controls (chart mode only) */}
        {viewMode === "chart" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              className="text-xs text-muted hover:text-foreground w-6 h-6 flex items-center justify-center rounded border border-white/[0.08] hover:border-white/[0.15] transition-colors"
            >
              +
            </button>
            <span className="text-[10px] text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))}
              className="text-xs text-muted hover:text-foreground w-6 h-6 flex items-center justify-center rounded border border-white/[0.08] hover:border-white/[0.15] transition-colors"
            >
              -
            </button>
            <button
              onClick={resetView}
              className="text-[10px] text-muted hover:text-foreground px-2 py-1 rounded border border-white/[0.08] hover:border-white/[0.15] transition-colors ml-1"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div id="context-tree-container" className="flex" style={{ height: "calc(100vh - 180px)" }}>
        {viewMode === "chart" ? (
          /* Chart view — zoomable canvas */
          <div
            className={`flex-1 overflow-hidden relative ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ userSelect: "none" }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)`,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
              }}
            />
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <div className="flex items-start gap-8 p-8">
                {tree.map((node) => (
                  <ContextTreeNode
                    key={node.filePath}
                    node={node}
                    selectedPath={selectedNode?.filePath || null}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
            <div className="absolute bottom-3 left-3 text-[9px] text-muted/30 pointer-events-none">
              Drag to pan · Ctrl+scroll to zoom
            </div>
          </div>
        ) : (
          /* List view — scrollable tree */
          <div className="flex-1 overflow-auto p-4">
            {tree.map((node) => (
              <ContextListNode
                key={node.filePath}
                node={node}
                selectedPath={selectedNode?.filePath || null}
                onSelect={handleSelect}
                isRoot
              />
            ))}
          </div>
        )}

        {/* Resize handle + detail panel */}
        {selectedNode && (
          <>
            <div
              onMouseDown={() => setIsResizing(true)}
              className={`w-1 shrink-0 cursor-col-resize hover:bg-accent/30 transition-colors ${
                isResizing ? "bg-accent/40" : "bg-white/[0.06]"
              }`}
            />
            <div
              className="border-l border-card-border overflow-y-auto shrink-0"
              style={{ width: `${panelWidth}%` }}
            >
              <ContextDetailPanel
                node={selectedNode}
                onSwitchToDirectory={onSwitchToDirectory}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
