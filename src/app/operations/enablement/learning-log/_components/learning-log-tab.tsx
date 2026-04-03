"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Sparkles, Loader2, Trash2, Pencil, Check, X } from "lucide-react"
import {
  LearningLogEntry,
  CATEGORIES,
  CATEGORY_COLORS,
} from "../_lib/learning-log-types"

export default function LearningLogTab() {
  const [entries, setEntries] = useState<LearningLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [askInput, setAskInput] = useState("")
  const [asking, setAsking] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Partial<LearningLogEntry>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/operations/enablement/learning-log/api")
    if (res.ok) setEntries(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const filtered = entries.filter((e) => {
    if (filter && e.category !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        e.concept.toLowerCase().includes(q) ||
        e.explanation.toLowerCase().includes(q) ||
        (e.context && e.context.toLowerCase().includes(q))
      )
    }
    return true
  })

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!askInput.trim() || asking) return

    setAsking(true)
    try {
      const res = await fetch("/operations/enablement/learning-log/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts: askInput.trim() }),
      })
      if (res.ok) {
        const newEntries: LearningLogEntry[] = await res.json()
        setEntries((prev) => [...newEntries, ...prev])
        setAskInput("")
      }
    } finally {
      setAsking(false)
    }
  }

  async function handleUpdate(id: string) {
    const res = await fetch("/operations/enablement/learning-log/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editFields }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    }
    setEditingId(null)
    setEditFields({})
  }

  async function handleDelete(id: string) {
    const res = await fetch("/operations/enablement/learning-log/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
    setConfirmDeleteId(null)
  }

  function startEdit(entry: LearningLogEntry) {
    setEditingId(entry.id)
    setEditFields({
      concept: entry.concept,
      explanation: entry.explanation,
      context: entry.context || "",
      category: entry.category,
    })
  }

  return (
    <div className="space-y-6">
      {/* Ask Claude bar */}
      <form onSubmit={handleAsk} className="flex gap-3">
        <div className="flex-1 relative">
          <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
          <input
            type="text"
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            placeholder="Ask Claude about a concept — e.g. 'database indexes, foreign keys' or 'what is a webhook?'"
            disabled={asking}
            className="w-full bg-card-bg border border-card-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!askInput.trim() || asking}
          className="px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2 text-sm font-medium shrink-0"
        >
          {asking ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Explaining...
            </>
          ) : (
            <>
              <Sparkles size={16} /> Ask Claude
            </>
          )}
        </button>
      </form>

      {/* Filters: search + category pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concepts..."
            className="bg-card-bg border border-card-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-56"
          />
        </div>
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filter === null ? "bg-accent text-white" : "bg-card-bg text-muted hover:text-foreground border border-card-border"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? CATEGORY_COLORS[cat]
                : "bg-card-bg text-muted hover:text-foreground border border-card-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Entry count */}
      <div className="text-xs text-muted">
        {filtered.length} concept{filtered.length !== 1 ? "s" : ""}
        {filter ? ` in ${filter}` : ""}
        {search ? ` matching "${search}"` : ""}
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="text-center text-muted py-12">Loading learning log...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
          <p className="text-sm text-muted">
            {entries.length === 0
              ? "No concepts logged yet. Ask Claude about something above, or concepts will appear here as you learn in Claude Code sessions."
              : "No concepts match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-card-bg border border-card-border rounded-lg px-4 py-3"
            >
              {editingId === entry.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editFields.concept || ""}
                    onChange={(e) => setEditFields((f) => ({ ...f, concept: e.target.value }))}
                    className="w-full bg-background border border-card-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                  <textarea
                    value={editFields.explanation || ""}
                    onChange={(e) => setEditFields((f) => ({ ...f, explanation: e.target.value }))}
                    rows={3}
                    className="w-full bg-background border border-card-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editFields.context || ""}
                      onChange={(e) => setEditFields((f) => ({ ...f, context: e.target.value }))}
                      placeholder="Context..."
                      className="flex-1 bg-background border border-card-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                    />
                    <select
                      value={editFields.category || "general"}
                      onChange={(e) => setEditFields((f) => ({ ...f, category: e.target.value }))}
                      className="bg-background border border-card-border rounded px-2 py-1.5 text-xs text-foreground"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleUpdate(entry.id)}
                      className="text-success hover:text-success/80"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditFields({}) }}
                      className="text-muted hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{entry.concept}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.general}`}>
                      {entry.category}
                    </span>
                    <span className="text-[10px] text-muted">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-muted hover:text-foreground"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirmDeleteId === entry.id) handleDelete(entry.id)
                        else setConfirmDeleteId(entry.id)
                      }}
                      className={`text-xs flex items-center gap-1 ${
                        confirmDeleteId === entry.id ? "text-red-400" : "text-muted hover:text-red-400"
                      }`}
                    >
                      <Trash2 size={12} />
                      {confirmDeleteId === entry.id ? "Confirm" : ""}
                    </button>
                  </div>
                  <p className="text-sm text-foreground/80">{entry.explanation}</p>
                  {entry.context && (
                    <p className="text-xs text-muted mt-1">Context: {entry.context}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
