"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Sparkles, Loader2, BookOpen, TrendingUp, FolderOpen } from "lucide-react"
import {
  LearningLogEntry,
  DEFAULT_CATEGORIES,
  getCategoryColor,
} from "../_lib/learning-log-types"
import CategorySection from "./category-section"
import EntryCard from "./entry-card"
import EntryEditor from "./entry-editor"
import ScreenshotDropzone from "./screenshot-dropzone"
import type { SuggestedUpdates } from "./refinement-chat"

type SortBy = "newest" | "oldest" | "a-z"

export default function LearningLogTab() {
  const [entries, setEntries] = useState<LearningLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [askInput, setAskInput] = useState("")
  const [asking, setAsking] = useState(false)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorEntry, setEditorEntry] = useState<LearningLogEntry | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessingScreenshot, setIsProcessingScreenshot] = useState(false)
  const [pendingProposals, setPendingProposals] = useState<Record<string, SuggestedUpdates>>({})

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/operations/enablement/learning-log/api")
    if (res.ok) setEntries(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Filtered + sorted entries
  const filtered = useMemo(() => {
    let result = entries.filter((e) => {
      if (filter && e.category !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          e.concept.toLowerCase().includes(q) ||
          e.explanation.toLowerCase().includes(q) ||
          (e.context && e.context.toLowerCase().includes(q)) ||
          (e.content && e.content.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
        )
      }
      return true
    })

    if (sortBy === "oldest") {
      result = [...result].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    } else if (sortBy === "a-z") {
      result = [...result].sort((a, b) => a.concept.localeCompare(b.concept))
    }
    // "newest" is default from API order

    return result
  }, [entries, filter, search, sortBy])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, LearningLogEntry[]> = {}
    for (const entry of filtered) {
      const cat = entry.category || "general"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(entry)
    }
    return groups
  }, [filtered])

  // All known categories: defaults + any custom ones from entries
  const allCategories = useMemo(() => {
    const fromEntries = new Set(entries.map((e) => e.category))
    const merged = new Set([...DEFAULT_CATEGORIES, ...fromEntries])
    return [...merged].sort()
  }, [entries])

  // Category counts (from all entries, not filtered)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) {
      counts[entry.category] = (counts[entry.category] || 0) + 1
    }
    return counts
  }, [entries])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = entries.filter((e) => new Date(e.created_at) >= weekAgo).length
    const topCategory = Object.entries(categoryCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]
    return { total: entries.length, thisWeek, topCategory: topCategory?.[0] || "—" }
  }, [entries, categoryCounts])

  // Ask Claude
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
        // Expand first new entry
        if (newEntries.length > 0) setExpandedEntryId(newEntries[0].id)
      }
    } finally {
      setAsking(false)
    }
  }

  // Update entry
  async function handleUpdate(id: string, fields: Partial<LearningLogEntry>) {
    const res = await fetch("/operations/enablement/learning-log/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    }
  }

  // Delete entry
  async function handleDelete(id: string) {
    const res = await fetch("/operations/enablement/learning-log/api", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
    setConfirmDeleteId(null)
  }

  // Screenshot processed
  function handleScreenshotProcessed(entry: LearningLogEntry) {
    setEntries((prev) => [entry, ...prev])
    setEditorEntry(entry)
    setEditorOpen(true)
    setExpandedEntryId(entry.id)
  }

  // Accept a proposed change — apply it via PATCH and clear from pending
  async function handleAcceptProposal(entryId: string, field: keyof SuggestedUpdates) {
    const proposals = pendingProposals[entryId]
    if (!proposals) return
    const value = proposals[field]
    if (value === undefined) return

    await handleUpdate(entryId, { [field]: value })

    setPendingProposals((prev) => {
      const next = { ...prev }
      const updated = { ...next[entryId] }
      delete updated[field]
      if (Object.keys(updated).length > 0) {
        next[entryId] = updated
      } else {
        delete next[entryId]
      }
      return next
    })
  }

  // Reject a proposed change — just dismiss it
  function handleRejectProposal(entryId: string, field: keyof SuggestedUpdates) {
    setPendingProposals((prev) => {
      const next = { ...prev }
      const updated = { ...next[entryId] }
      delete updated[field]
      if (Object.keys(updated).length > 0) {
        next[entryId] = updated
      } else {
        delete next[entryId]
      }
      return next
    })
  }

  // Receive proposals from the editor's refinement chat
  function handleProposedChanges(entryId: string, updates: SuggestedUpdates) {
    setPendingProposals((prev) => ({ ...prev, [entryId]: updates }))
    // Auto-expand the entry so the user sees the proposals
    setExpandedEntryId(entryId)
  }

  // Toggle category collapse
  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Open editor
  function openEditor(entry: LearningLogEntry) {
    setEditorEntry(entry)
    setEditorOpen(true)
  }

  const isSearchActive = search.length > 0
  const sortedCategoryKeys = Object.keys(grouped).sort()

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex items-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <BookOpen size={13} />
          <span>{stats.total} entries</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} />
          <span>{stats.thisWeek} this week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FolderOpen size={13} />
          <span>Top: {stats.topCategory}</span>
        </div>
      </div>

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

      {/* Screenshot dropzone */}
      <ScreenshotDropzone
        isDragOver={isDragOver}
        isProcessing={isProcessingScreenshot}
        onDragStateChange={setIsDragOver}
        onScreenshotProcessed={handleScreenshotProcessed}
        onProcessingChange={setIsProcessingScreenshot}
      />

      {/* Filter bar */}
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
            filter === null
              ? "bg-accent text-white"
              : "bg-card-bg text-muted hover:text-foreground border border-card-border"
          }`}
        >
          All ({entries.length})
        </button>
        {allCategories.map((cat) => {
          const count = categoryCounts[cat] || 0
          if (count === 0) return null
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === cat
                  ? getCategoryColor(cat)
                  : "bg-card-bg text-muted hover:text-foreground border border-card-border"
              }`}
            >
              {cat} ({count})
            </button>
          )
        })}
        <div className="flex-1" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="bg-card-bg border border-card-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="a-z">A → Z</option>
        </select>
      </div>

      {/* Entry count */}
      <div className="text-xs text-muted">
        {filtered.length} concept{filtered.length !== 1 ? "s" : ""}
        {filter ? ` in ${filter}` : ""}
        {search ? ` matching "${search}"` : ""}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-card-bg border border-card-border rounded-lg px-4 py-3 animate-pulse"
            >
              <div className="h-4 bg-card-border rounded w-1/3 mb-2" />
              <div className="h-3 bg-card-border rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border p-8 text-center">
          <p className="text-sm text-muted">
            {entries.length === 0
              ? "No concepts logged yet. Ask Claude about something above, or concepts will appear here as you learn in Claude Code sessions."
              : "No concepts match your filters."}
          </p>
        </div>
      ) : isSearchActive ? (
        /* Flat list when searching */
        <div className="space-y-2">
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntryId === entry.id}
              isConfirmingDelete={confirmDeleteId === entry.id}
              proposals={pendingProposals[entry.id] || null}
              onToggleExpand={() =>
                setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)
              }
              onEdit={() => openEditor(entry)}
              onDelete={() => handleDelete(entry.id)}
              onConfirmDelete={() => setConfirmDeleteId(entry.id)}
              onAcceptProposal={(field) => handleAcceptProposal(entry.id, field)}
              onRejectProposal={(field) => handleRejectProposal(entry.id, field)}
            />
          ))}
        </div>
      ) : (
        /* Category-grouped sections */
        <div className="space-y-5">
          {sortedCategoryKeys.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              entries={grouped[cat]}
              isCollapsed={collapsedCategories.has(cat)}
              expandedEntryId={expandedEntryId}
              confirmDeleteId={confirmDeleteId}
              proposalsMap={pendingProposals}
              onToggleCollapse={() => toggleCategory(cat)}
              onToggleEntry={(id) =>
                setExpandedEntryId(expandedEntryId === id ? null : id)
              }
              onEditEntry={openEditor}
              onDeleteEntry={handleDelete}
              onConfirmDelete={(id) => setConfirmDeleteId(id)}
              onAcceptProposal={handleAcceptProposal}
              onRejectProposal={handleRejectProposal}
            />
          ))}
        </div>
      )}

      {/* Slide-over editor */}
      {editorOpen && editorEntry && (
        <EntryEditor
          entry={editorEntry}
          allCategories={allCategories}
          onSave={handleUpdate}
          onClose={() => {
            setEditorOpen(false)
            setEditorEntry(null)
          }}
          onEntryUpdated={(updated) => {
            setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            setEditorEntry(updated)
          }}
          onProposedChanges={(updates) => handleProposedChanges(editorEntry.id, updates)}
        />
      )}
    </div>
  )
}
