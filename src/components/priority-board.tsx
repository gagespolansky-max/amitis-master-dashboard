'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'

interface Priority {
  id: string
  title: string
  description: string
  source: 'email' | 'attio' | 'inferred' | string
  urgency: 'high' | 'medium' | 'low' | string
  pinned?: boolean
}

interface PriorityData {
  this_week: Priority[]
  this_month: Priority[]
  on_deck: Priority[]
  last_refreshed: string | null
}

const columns = [
  { id: 'this_week', label: 'This Week', color: 'text-red-400', borderColor: 'border-red-500/20' },
  { id: 'this_month', label: 'This Month', color: 'text-warning', borderColor: 'border-warning/20' },
  { id: 'on_deck', label: 'On Deck', color: 'text-accent', borderColor: 'border-accent/20' },
] as const

const sourceStyles: Record<string, string> = {
  email: 'bg-blue-500/10 text-blue-400',
  attio: 'bg-purple-500/10 text-purple-400',
  inferred: 'bg-muted/10 text-muted',
}

const urgencyDot: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-warning',
  low: 'bg-muted',
}

export default function PriorityBoard() {
  const [data, setData] = useState<PriorityData>({
    this_week: [],
    this_month: [],
    on_deck: [],
    last_refreshed: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/priorities')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = useCallback((updated: PriorityData) => {
    fetch('/api/priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }, [])

  function onDragEnd(result: DropResult) {
    const { source, destination } = result
    if (!destination) return

    const sourceCol = source.droppableId as keyof Pick<PriorityData, 'this_week' | 'this_month' | 'on_deck'>
    const destCol = destination.droppableId as keyof Pick<PriorityData, 'this_week' | 'this_month' | 'on_deck'>

    const updated = { ...data }
    const sourceItems = [...updated[sourceCol]]
    const [moved] = sourceItems.splice(source.index, 1)

    moved.pinned = true

    if (sourceCol === destCol) {
      sourceItems.splice(destination.index, 0, moved)
      updated[sourceCol] = sourceItems
    } else {
      const destItems = [...updated[destCol]]
      destItems.splice(destination.index, 0, moved)
      updated[sourceCol] = sourceItems
      updated[destCol] = destItems
    }

    setData(updated)
    save(updated)
  }

  function formatRefreshTime(iso: string | null) {
    if (!iso) return 'Never'
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-card-border bg-card-bg p-8 text-center">
        <p className="text-sm text-muted">Loading priorities...</p>
      </div>
    )
  }

  const isEmpty = !data.this_week.length && !data.this_month.length && !data.on_deck.length

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
        <h3 className="text-sm font-medium mb-1">No priorities yet</h3>
        <p className="text-sm text-muted">
          Run the refresh script to pull priorities from your email and Attio:
        </p>
        <code className="mt-2 inline-block text-xs bg-card-bg px-3 py-1.5 rounded text-accent">
          cd ~/master-dashboard && source venv/bin/activate && python scripts/refresh-priorities.py
        </code>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">
          Last refreshed: {formatRefreshTime(data.last_refreshed)}
        </p>
        <p className="text-xs text-muted">Drag items to reorder or move between columns</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.id} className={`rounded-xl border border-card-border bg-card-bg`}>
              <div className={`px-4 py-3 border-b ${col.borderColor}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${col.color}`}>{col.label}</h3>
                  <span className="text-xs text-muted">
                    {data[col.id as keyof Pick<PriorityData, 'this_week' | 'this_month' | 'on_deck'>].length}
                  </span>
                </div>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-2 min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    {data[col.id as keyof Pick<PriorityData, 'this_week' | 'this_month' | 'on_deck'>].map(
                      (item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-2 p-3 rounded-lg border transition-all ${
                                snapshot.isDragging
                                  ? 'border-accent/40 bg-accent/5 shadow-lg'
                                  : 'border-card-border bg-background hover:border-card-border/80'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                    urgencyDot[item.urgency] || 'bg-muted'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium leading-snug">{item.title}</h4>
                                  <p className="text-xs text-muted mt-1 leading-relaxed">
                                    {item.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span
                                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                        sourceStyles[item.source] || sourceStyles.inferred
                                      }`}
                                    >
                                      {item.source}
                                    </span>
                                    {item.pinned && (
                                      <span className="text-[10px] text-muted">pinned</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
