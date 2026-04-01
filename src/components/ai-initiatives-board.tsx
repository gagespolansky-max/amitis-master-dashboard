"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Loader2, ChevronDown, ChevronUp, Trash2, Sparkles } from "lucide-react"

interface Initiative {
  id: string
  title: string
  summary: string | null
  description: string | null
  status: string
  priority: string
  category: string | null
  business_segment: string | null
  linked_skills: string[] | null
  linked_proposals: string[] | null
  requirements: string[] | null
  progress_notes: string | null
  target_date: string | null
  created_at: string
  updated_at: string
}

const STATUSES = ["idea", "scoping", "in_progress", "testing", "shipped"] as const
const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  scoping: "Scoping",
  in_progress: "In Progress",
  testing: "Testing",
  shipped: "Shipped",
}
const STATUS_COLORS: Record<string, string> = {
  idea: "bg-zinc-500/20 text-zinc-400",
  scoping: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  testing: "bg-purple-500/20 text-purple-400",
  shipped: "bg-green-500/20 text-green-400",
}
const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-zinc-500/20 text-zinc-400",
}

export default function AIInitiativesBoard() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [input, setInput] = useState("")
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchInitiatives = useCallback(async () => {
    const res = await fetch("/api/ai-initiatives")
    if (res.ok) setInitiatives(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInitiatives()
  }, [fetchInitiatives])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || generating) return

    setGenerating(true)
    try {
      const res = await fetch("/api/ai-initiatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      })
      if (res.ok) {
        const newInit = await res.json()
        setInitiatives((prev) => [newInit, ...prev])
        setInput("")
        setExpanded((prev) => new Set([...prev, newInit.id]))
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch("/api/ai-initiatives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setInitiatives((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/ai-initiatives", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setInitiatives((prev) => prev.filter((i) => i.id !== id))
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const byStatus = (status: string) => initiatives.filter((i) => i.status === status)

  return (
    <div className="space-y-6">
      {/* Quick-add bar */}
      <form onSubmit={handleGenerate} className="flex gap-3">
        <div className="flex-1 relative">
          <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe an initiative — e.g. 'Gmail plugin for flagging deals' or 'Dropbox integration for shared docs'..."
            disabled={generating}
            className="w-full bg-card-bg border border-card-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || generating}
          className="px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2 text-sm font-medium shrink-0"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Plus size={16} /> Add Initiative
            </>
          )}
        </button>
      </form>

      {loading ? (
        <div className="text-center text-muted py-12">Loading initiatives...</div>
      ) : initiatives.length === 0 ? (
        <div className="text-center text-muted py-12">
          <p className="text-lg mb-2">No initiatives yet</p>
          <p className="text-sm">Type a quick description above and Claude will build out the full card.</p>
        </div>
      ) : (
        /* Status columns */
        <div className="space-y-8">
          {STATUSES.map((status) => {
            const items = byStatus(status)
            if (items.length === 0) return null
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((init) => (
                    <InitiativeCard
                      key={init.id}
                      initiative={init}
                      isExpanded={expanded.has(init.id)}
                      onToggle={() => toggleExpand(init.id)}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InitiativeCard({
  initiative: init,
  isExpanded,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  initiative: Initiative
  isExpanded: boolean
  onToggle: () => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-card-bg/80"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{init.title}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[init.priority]}`}>
              {init.priority}
            </span>
            {init.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                {init.category}
              </span>
            )}
            {init.business_segment && (
              <span className="text-[10px] text-muted">
                {init.business_segment}
              </span>
            )}
          </div>
          {init.summary && (
            <div className="text-xs text-muted mt-0.5 truncate">{init.summary}</div>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-muted shrink-0" /> : <ChevronDown size={16} className="text-muted shrink-0" />}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-card-border/50 pt-3 space-y-3">
          {init.description && (
            <p className="text-sm text-foreground/80">{init.description}</p>
          )}

          {init.requirements && (
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-1">Requirements</div>
              <ul className="text-xs text-foreground/70 space-y-0.5">
                {(Array.isArray(init.requirements) ? init.requirements : (() => { try { return JSON.parse(init.requirements as unknown as string) } catch { return [] } })()).map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-muted mt-0.5">-</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted">Status:</span>
              <select
                value={init.status}
                onChange={(e) => onStatusChange(init.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-background border border-card-border rounded px-2 py-0.5 text-xs text-foreground"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-muted">
              Added {new Date(init.created_at).toLocaleDateString()}
            </span>

            <div className="flex-1" />

            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!confirmDelete) setConfirmDelete(true)
                else onDelete(init.id)
              }}
              className={`text-xs flex items-center gap-1 ${confirmDelete ? "text-danger" : "text-muted hover:text-danger"}`}
            >
              <Trash2 size={12} />
              {confirmDelete ? "Confirm" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
