'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { OrgPerson, OrgGroup, OrgEdge } from '../_lib/types'
import PersonNode from './person-node'
import ExternalProviders from './external-providers'
import PersonDetailPanel from './person-detail-panel'
import TechStackPills from './tech-stack-pills'

const CARD_W = 180
const CARD_H = 60

/* ─── Hover Tooltip ─── */
function HoverTooltip({ person, position }: { person: OrgPerson; position: { x: number; y: number } }) {
  const responsibilities = person.responsibilities
    ? person.responsibilities.split(',').map((r) => r.trim()).filter(Boolean)
    : []

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: position.x, top: position.y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <div className="bg-[#1a1b23] border border-white/[0.12] rounded-lg shadow-xl px-4 py-3 max-w-[300px]">
        {person.job_description && (
          <div className="mb-2">
            <p className="text-[9px] font-medium text-muted uppercase tracking-wider mb-0.5">Background</p>
            <p className="text-[10px] text-foreground/80 leading-relaxed line-clamp-3">{person.job_description}</p>
          </div>
        )}
        {responsibilities.length > 0 && (
          <div className="mb-2">
            <p className="text-[9px] font-medium text-muted uppercase tracking-wider mb-0.5">Responsibilities</p>
            <ul className="space-y-0.5">
              {responsibilities.map((r, i) => (
                <li key={i} className="text-[10px] text-foreground/80 flex items-start gap-1">
                  <span className="text-muted">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {person.tech_stack && person.tech_stack.length > 0 && (
          <div>
            <p className="text-[9px] font-medium text-muted uppercase tracking-wider mb-0.5">Platforms</p>
            <TechStackPills items={person.tech_stack} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Auto-layout (BFS tree) ─── */
function computeAutoLayout(people: OrgPerson[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const internal = people.filter((p) => p.team !== 'external')
  const childrenOf = new Map<string | null, OrgPerson[]>()

  for (const p of internal) {
    const key = p.parent_id || null
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(p)
  }

  const roots = childrenOf.get(null) || []
  const queue: { person: OrgPerson; depth: number }[] = []

  for (const root of roots) {
    queue.push({ person: root, depth: 0 })
  }

  const depthCounts = new Map<number, number>()

  while (queue.length > 0) {
    const { person, depth } = queue.shift()!
    const count = depthCounts.get(depth) || 0
    depthCounts.set(depth, count + 1)

    positions.set(person.id, { x: count * 220 + 40, y: depth * 140 + 40 })

    const children = childrenOf.get(person.id) || []
    for (const child of children) {
      queue.push({ person: child, depth: depth + 1 })
    }
  }

  return positions
}

/* ─── Nearest-side anchor points ─── */
function getAnchors(
  ax: number, ay: number, bx: number, by: number,
): { x1: number; y1: number; x2: number; y2: number } {
  // Center of each card
  const aCx = ax + CARD_W / 2, aCy = ay + CARD_H / 2
  const bCx = bx + CARD_W / 2, bCy = by + CARD_H / 2

  // 4 anchor points per card: top, bottom, left, right
  const aAnchors = [
    { x: ax + CARD_W / 2, y: ay },           // top
    { x: ax + CARD_W / 2, y: ay + CARD_H },  // bottom
    { x: ax, y: ay + CARD_H / 2 },           // left
    { x: ax + CARD_W, y: ay + CARD_H / 2 },  // right
  ]
  const bAnchors = [
    { x: bx + CARD_W / 2, y: by },           // top
    { x: bx + CARD_W / 2, y: by + CARD_H },  // bottom
    { x: bx, y: by + CARD_H / 2 },           // left
    { x: bx + CARD_W, y: by + CARD_H / 2 },  // right
  ]

  // Find the closest pair
  let best = { x1: 0, y1: 0, x2: 0, y2: 0 }
  let bestDist = Infinity
  for (const a of aAnchors) {
    for (const b of bAnchors) {
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2
      if (d < bestDist) {
        bestDist = d
        best = { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
      }
    }
  }
  return best
}

/* ─── SVG line between two anchor points ─── */
function EdgeLine({
  x1, y1, x2, y2, color, selected, onClick,
}: {
  x1: number; y1: number; x2: number; y2: number
  color: string; selected: boolean; onClick: () => void
}) {
  // Determine if connection is more horizontal or vertical
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)
  let path: string

  if (dy > dx) {
    // Mostly vertical — use vertical bezier
    const midY = (y1 + y2) / 2
    path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
  } else {
    // Mostly horizontal — use horizontal bezier
    const midX = (x1 + x2) / 2
    path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  }

  return (
    <g onClick={(e) => { e.stopPropagation(); onClick() }} className="cursor-pointer">
      {/* Fat invisible hit area */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
      {/* Visible line */}
      <path
        d={path}
        fill="none"
        stroke={selected ? '#ef4444' : color}
        strokeWidth={selected ? 2.5 : 1.5}
        className="transition-colors"
      />
    </g>
  )
}

/* ─── Helpers ─── */
async function savePosition(id: string, x: number, y: number) {
  await fetch('/operations/organization/api', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, pos_x: x, pos_y: y }),
  })
}

/* ─── Main ─── */
export default function OrgChart() {
  const [people, setPeople] = useState<OrgPerson[]>([])
  const [groups, setGroups] = useState<OrgGroup[]>([])
  const [edgeData, setEdgeData] = useState<OrgEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<{ sourceId: string; targetId: string } | null>(null)

  // Pan & zoom
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Card drag
  const [dragging, setDragging] = useState<string | null>(null)
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 })
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())

  // Undo history: stores edge actions
  const undoStack = useRef<{ action: 'add' | 'remove'; sourceId: string; targetId: string }[]>([])

  // Connecting
  const [connecting, setConnecting] = useState<string | null>(null) // source person id
  const [connectMousePos, setConnectMousePos] = useState({ x: 0, y: 0 })

  // Hover
  const [hoverPerson, setHoverPerson] = useState<OrgPerson | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detail panel
  const [panelWidth, setPanelWidth] = useState(35)
  const [isResizing, setIsResizing] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pRes, gRes, eRes] = await Promise.all([
      fetch('/operations/organization/api'),
      fetch('/operations/organization/api/groups'),
      fetch('/operations/organization/api/edges'),
    ])
    const pData: OrgPerson[] = pRes.ok ? await pRes.json() : []
    const gData: OrgGroup[] = gRes.ok ? await gRes.json() : []
    const eData: OrgEdge[] = eRes.ok ? await eRes.json() : []
    setPeople(pData)
    setGroups(gData)
    setEdgeData(eData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Build position map from people data
  const autoPositions = useMemo(() => computeAutoLayout(people), [people])

  // Initialize positions from people data — only set positions for cards we don't already have
  useEffect(() => {
    setPositions((prev) => {
      const next = new Map(prev)
      const internal = people.filter((p) => p.team !== 'external')
      for (const p of internal) {
        if (!next.has(p.id)) {
          const fallback = autoPositions.get(p.id) || { x: 0, y: 0 }
          next.set(p.id, { x: p.pos_x ?? fallback.x, y: p.pos_y ?? fallback.y })
        }
      }
      return next
    })
  }, [people, autoPositions])

  // Batch-save auto positions when all null (first load)
  useEffect(() => {
    const internal = people.filter((p) => p.team !== 'external')
    if (internal.length === 0) return
    if (!internal.every((p) => p.pos_x === null && p.pos_y === null)) return
    Promise.all(
      internal.map((p) => {
        const pos = autoPositions.get(p.id)
        return pos ? savePosition(p.id, pos.x, pos.y) : null
      }).filter(Boolean)
    ).then(() => fetchData())
  }, [people, autoPositions, fetchData])

  const internal = useMemo(() => people.filter((p) => p.team !== 'external'), [people])
  const external = useMemo(() => people.filter((p) => p.team === 'external'), [people])
  const idSet = useMemo(() => new Set(internal.map((p) => p.id)), [internal])

  /* ── Pan handlers ── */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on direct canvas click (not on cards)
    if ((e.target as HTMLElement).closest('[data-person-id]')) return
    if (e.button !== 0) return
    setIsPanning(true)
    setSelectedEdge(null)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      })
    }
    if (dragging) {
      const dx = (e.clientX - dragStart.current.x) / zoom
      const dy = (e.clientY - dragStart.current.y) / zoom
      setPositions((prev) => {
        const next = new Map(prev)
        next.set(dragging, { x: dragStart.current.origX + dx, y: dragStart.current.origY + dy })
        return next
      })
    }
    if (connecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setConnectMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      })
    }
  }, [isPanning, dragging, connecting, zoom, pan])

  const handleCanvasMouseUp = useCallback(() => {
    if (dragging) {
      const pos = positions.get(dragging)
      if (pos) savePosition(dragging, pos.x, pos.y)
      setDragging(null)
    }
    setIsPanning(false)
  }, [dragging, positions])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom((z) => Math.min(2, Math.max(0.2, z + (e.deltaY > 0 ? -0.08 : 0.08))))
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
    }
  }, [])

  /* ── Card drag ── */
  const handleCardMouseDown = useCallback((personId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) {
      // Shift+drag = start connecting
      setConnecting(personId)
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const pos = positions.get(personId) || { x: 0, y: 0 }
        setConnectMousePos({ x: pos.x + CARD_W / 2, y: pos.y + CARD_H })
      }
      return
    }
    const pos = positions.get(personId) || { x: 0, y: 0 }
    dragStart.current = { x: e.clientX, y: e.clientY, origX: pos.x, origY: pos.y }
    setDragging(personId)
  }, [positions])

  /* ── Connect drop ── */
  const handleCardMouseUp = useCallback(async (targetId: string) => {
    if (connecting && connecting !== targetId) {
      undoStack.current.push({ action: 'add', sourceId: connecting, targetId })

      // Optimistic local update
      setEdgeData((prev) => [...prev, { id: `temp-${Date.now()}`, source_id: connecting, target_id: targetId, created_at: '' }])
      setConnecting(null)

      // Persist in background
      fetch('/operations/organization/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: connecting, target_id: targetId }),
      })
    }
  }, [connecting])

  // End connect on canvas mouseup
  useEffect(() => {
    if (!connecting) return
    function onUp() { setConnecting(null) }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [connecting])

  /* ── Delete selected edge + Undo (Cmd+Z) ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Delete selected edge
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedEdge) {
        e.preventDefault()
        const { sourceId, targetId } = selectedEdge
        undoStack.current.push({ action: 'remove', sourceId, targetId })

        setEdgeData((prev) => prev.filter((ed) => !(ed.source_id === sourceId && ed.target_id === targetId)))
        setSelectedEdge(null)

        fetch('/operations/organization/api/edges', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
        })
      }

      // Undo: Cmd+Z / Ctrl+Z
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const last = undoStack.current.pop()
        if (!last) return
        e.preventDefault()

        if (last.action === 'add') {
          // Undo an add = remove that edge
          setEdgeData((prev) => prev.filter((ed) => !(ed.source_id === last.sourceId && ed.target_id === last.targetId)))
          fetch('/operations/organization/api/edges', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_id: last.sourceId, target_id: last.targetId }),
          })
        } else {
          // Undo a remove = re-add that edge
          setEdgeData((prev) => [...prev, { id: `temp-${Date.now()}`, source_id: last.sourceId, target_id: last.targetId, created_at: '' }])
          fetch('/operations/organization/api/edges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_id: last.sourceId, target_id: last.targetId }),
          })
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedEdge])

  /* ── Hover ── */
  const handleHoverEnter = useCallback((person: OrgPerson, e: React.MouseEvent) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      setHoverPerson(person)
      setHoverPos({ x: e.clientX, y: e.clientY })
    }, 1500)
  }, [])

  const handleHoverLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHoverPerson(null)
  }, [])

  const handleHoverMove = useCallback((person: OrgPerson, e: React.MouseEvent) => {
    if (hoverPerson?.id === person.id) setHoverPos({ x: e.clientX, y: e.clientY })
  }, [hoverPerson])

  /* ── Panel resize ── */
  useEffect(() => {
    if (!isResizing) return
    function onMove(e: MouseEvent) {
      const el = document.getElementById('org-chart-container')
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPanelWidth(Math.min(50, Math.max(20, ((rect.right - e.clientX) / rect.width) * 100)))
    }
    function onUp() { setIsResizing(false) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [isResizing])

  const handleSelect = useCallback((id: string) => {
    if (dragging) return
    setSelectedId((prev) => (prev === id ? null : id))
    setSelectedEdge(null)
  }, [dragging])

  function resetView() { setZoom(0.85); setPan({ x: 0, y: 0 }) }

  // Build edges from org_edges table (must be before early returns — rules of hooks)
  const personById = useMemo(() => {
    const map = new Map<string, OrgPerson>()
    for (const p of internal) map.set(p.id, p)
    return map
  }, [internal])

  const edges = useMemo(() => {
    return edgeData
      .filter((e) => idSet.has(e.source_id) && idSet.has(e.target_id))
      .map((e) => {
        const source = personById.get(e.source_id)
        const target = personById.get(e.target_id)
        const isSamara = source?.team === 'samara' || target?.team === 'samara'
        return { sourceId: e.source_id, targetId: e.target_id, isSamara }
      })
  }, [edgeData, idSet, personById])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted" /></div>
  }

  if (people.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">No org data yet.</p>
        <button
          onClick={async () => { const res = await fetch('/operations/organization/api/seed', { method: 'POST' }); if (res.ok) fetchData() }}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/80 transition-colors"
        >Seed Organization Data</button>
      </div>
    )
  }

  const selectedPerson = selectedId ? people.find((p) => p.id === selectedId) || null : null

  return (
    <div>
      <div id="org-chart-container" className="border border-card-border rounded-xl overflow-hidden bg-card-bg flex" style={{ height: 'calc(100vh - 260px)' }}>
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3 border-b border-card-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Organization</span>
              <span className="text-xs text-muted">{internal.length} people</span>
              <div className="flex items-center gap-2 ml-2">
                <span className="flex items-center gap-1 text-[9px] text-muted"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active</span>
                <span className="flex items-center gap-1 text-[9px] text-muted"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Incoming</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedEdge && (
                <button
                  onClick={() => {
                    const { sourceId, targetId } = selectedEdge
                    undoStack.current.push({ action: 'remove', sourceId, targetId })
                    setEdgeData((prev) => prev.filter((ed) => !(ed.source_id === sourceId && ed.target_id === targetId)))
                    setSelectedEdge(null)
                    fetch('/operations/organization/api/edges', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ source_id: sourceId, target_id: targetId }),
                    })
                  }}
                  className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:border-red-500/50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete Connection
                </button>
              )}
              <span className="text-[9px] text-muted/50">Shift+drag to connect</span>
              <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="text-xs text-muted hover:text-foreground w-6 h-6 flex items-center justify-center rounded border border-white/[0.08] hover:border-white/[0.15] transition-colors">+</button>
              <span className="text-[10px] text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))} className="text-xs text-muted hover:text-foreground w-6 h-6 flex items-center justify-center rounded border border-white/[0.08] hover:border-white/[0.15] transition-colors">-</button>
              <button onClick={resetView} className="text-[10px] text-muted hover:text-foreground px-2 py-1 rounded border border-white/[0.08] hover:border-white/[0.15] transition-colors ml-1">Reset</button>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className={`flex-1 overflow-hidden relative ${isPanning ? 'cursor-grabbing' : connecting ? 'cursor-crosshair' : 'cursor-grab'}`}
            style={{ userSelect: 'none' }}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {/* Dot grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
              }}
            />

            {/* Transformed layer */}
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}>
              {/* SVG edges */}
              <svg className="absolute top-0 left-0 overflow-visible" style={{ width: 1, height: 1 }}>
                {edges.map(({ sourceId, targetId, isSamara }) => {
                  const sp = positions.get(sourceId)
                  const tp = positions.get(targetId)
                  if (!sp || !tp) return null
                  const anchors = getAnchors(sp.x, sp.y, tp.x, tp.y)
                  return (
                    <EdgeLine
                      key={`${sourceId}-${targetId}`}
                      x1={anchors.x1} y1={anchors.y1}
                      x2={anchors.x2} y2={anchors.y2}
                      color={isSamara ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)'}
                      selected={selectedEdge?.sourceId === sourceId && selectedEdge?.targetId === targetId}
                      onClick={() => setSelectedEdge((prev) =>
                        prev?.sourceId === sourceId && prev?.targetId === targetId
                          ? null
                          : { sourceId, targetId }
                      )}
                    />
                  )
                })}
                {/* Live connecting line */}
                {connecting && (() => {
                  const sp = positions.get(connecting)
                  if (!sp) return null
                  // Find nearest anchor on source card to the mouse position
                  const sourceAnchors = [
                    { x: sp.x + CARD_W / 2, y: sp.y },
                    { x: sp.x + CARD_W / 2, y: sp.y + CARD_H },
                    { x: sp.x, y: sp.y + CARD_H / 2 },
                    { x: sp.x + CARD_W, y: sp.y + CARD_H / 2 },
                  ]
                  let nearest = sourceAnchors[0]
                  let bestDist = Infinity
                  for (const a of sourceAnchors) {
                    const d = (a.x - connectMousePos.x) ** 2 + (a.y - connectMousePos.y) ** 2
                    if (d < bestDist) { bestDist = d; nearest = a }
                  }
                  return (
                    <path
                      d={`M ${nearest.x} ${nearest.y} L ${connectMousePos.x} ${connectMousePos.y}`}
                      fill="none"
                      stroke="rgba(99,102,241,0.5)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                  )
                })()}
              </svg>

              {/* Person cards */}
              {internal.map((person) => {
                const pos = positions.get(person.id) || { x: 0, y: 0 }
                return (
                  <div
                    key={person.id}
                    className="absolute"
                    style={{ left: pos.x, top: pos.y }}
                    onMouseDown={(e) => handleCardMouseDown(person.id, e)}
                    onMouseUp={() => handleCardMouseUp(person.id)}
                    onMouseEnter={(e) => handleHoverEnter(person, e)}
                    onMouseLeave={handleHoverLeave}
                    onMouseMove={(e) => handleHoverMove(person, e)}
                  >
                    <PersonNode
                      person={person}
                      isSelected={selectedId === person.id}
                      onClick={() => handleSelect(person.id)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="absolute bottom-3 left-3 pointer-events-none bg-card-bg/80 border border-card-border rounded-lg px-3 py-2">
              <div className="text-[9px] text-muted space-y-0.5">
                <div><span className="text-foreground/50">Drag card</span> — move</div>
                <div><span className="text-foreground/50">Shift + drag card</span> — draw connection</div>
                <div><span className="text-foreground/50">Click line</span> — select (turns red)</div>
                <div><span className="text-foreground/50">Delete / Backspace</span> — remove selected line</div>
                <div><span className="text-foreground/50">Cmd+Z</span> — undo connection change</div>
                <div><span className="text-foreground/50">Scroll</span> — pan · <span className="text-foreground/50">Ctrl+scroll</span> — zoom</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedPerson && (
          <>
            <div
              onMouseDown={() => setIsResizing(true)}
              className={`w-1 shrink-0 cursor-col-resize hover:bg-accent/30 transition-colors ${isResizing ? 'bg-accent/40' : 'bg-white/[0.06]'}`}
            />
            <div className="border-l border-card-border shrink-0 bg-card-bg" style={{ width: `${panelWidth}%` }}>
              <PersonDetailPanel person={selectedPerson} onClose={() => setSelectedId(null)} />
            </div>
          </>
        )}
      </div>

      <div className="mt-6">
        <ExternalProviders providers={external} />
      </div>

      {hoverPerson && !connecting && <HoverTooltip person={hoverPerson} position={hoverPos} />}

      {connecting && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-accent/90 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Drop on a card to connect · Release elsewhere to cancel
        </div>
      )}
    </div>
  )
}
