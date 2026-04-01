"use client"

import { useState } from "react"
import { Deal, STAGE_LABELS, PRIORITY_COLORS } from "../_lib/types"
import { X, Loader2, GitMerge, ChevronDown, ChevronRight } from "lucide-react"

interface DedupGroup {
  names: string[]
  primary: string
  count: number
}

interface DedupDialogProps {
  deals: Deal[]
  onMerge: (targetId: string, sourceId: string) => Promise<void>
  onClose: () => void
  onRefresh: () => void
}

export default function DedupDialog({ deals, onMerge, onClose, onRefresh }: DedupDialogProps) {
  const [groups, setGroups] = useState<DedupGroup[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergedGroups, setMergedGroups] = useState<Set<number>>(new Set())
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function scan() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/acio/deals/api/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: true }),
      })
      if (!res.ok) throw new Error("Failed to scan")
      const data = await res.json()
      setGroups(data.groups)
      if (data.groups.length > 0) setExpandedGroup(0)
    } catch {
      setError("Failed to scan for duplicates")
    } finally {
      setLoading(false)
    }
  }

  async function mergeGroup(groupIndex: number) {
    if (!groups) return
    const group = groups[groupIndex]
    setMerging(true)

    // Find deals matching this group
    const groupDeals = group.names
      .map((name) => deals.find((d) => d.company_name === name))
      .filter(Boolean) as Deal[]

    if (groupDeals.length < 2) {
      setMerging(false)
      return
    }

    // Primary is the one matching group.primary
    const primary = groupDeals.find((d) => d.company_name === group.primary) || groupDeals[0]
    const secondaries = groupDeals.filter((d) => d.id !== primary.id)

    try {
      for (const source of secondaries) {
        await onMerge(primary.id, source.id)
      }
      setMergedGroups((prev) => new Set([...prev, groupIndex]))
    } finally {
      setMerging(false)
    }
  }

  async function mergeAll() {
    if (!groups) return
    setMerging(true)
    try {
      const res = await fetch("/acio/deals/api/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: false }),
      })
      if (res.ok) {
        onRefresh()
        onClose()
      }
    } finally {
      setMerging(false)
    }
  }

  // Initial state — show scan button
  if (groups === null && !loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-background border border-card-border rounded-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Find Duplicates</h2>
            <button onClick={onClose} className="text-muted hover:text-foreground">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-muted mb-4">
            Scan all deals for duplicate company names using normalization matching.
            You can review and merge each group individually.
          </p>
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          <button
            onClick={scan}
            className="w-full text-sm px-4 py-2.5 bg-accent text-white rounded-md hover:bg-accent-hover flex items-center justify-center gap-2"
          >
            <GitMerge size={16} /> Scan for Duplicates
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background border border-card-border rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="sticky top-0 bg-background border-b border-card-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Duplicate Groups</h2>
            {groups && (
              <p className="text-xs text-muted mt-0.5">
                {groups.length} group{groups.length !== 1 ? "s" : ""} found
                {" "}({groups.reduce((s, g) => s + g.count - 1, 0)} duplicates)
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          )}

          {groups && groups.length === 0 && (
            <div className="text-center py-12 text-muted">
              No duplicates found. Your deal list is clean.
            </div>
          )}

          {groups && groups.length > 0 && (
            <div className="space-y-2">
              {groups.map((group, i) => {
                const isMerged = mergedGroups.has(i)
                const isExpanded = expandedGroup === i

                return (
                  <div
                    key={i}
                    className={`border rounded-lg overflow-hidden ${
                      isMerged ? "border-green-500/30 bg-green-500/5" : "border-card-border"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedGroup(isExpanded ? null : i)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-card-bg/50 text-left cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-muted shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {group.primary}
                          {isMerged && <span className="text-green-400 ml-2 text-xs">Merged</span>}
                        </div>
                        <div className="text-xs text-muted">
                          {group.count} deal{group.count !== 1 ? "s" : ""} — keep &quot;{group.primary}&quot;
                        </div>
                      </div>
                      {!isMerged && (
                        <button
                          onClick={(e) => { e.stopPropagation(); mergeGroup(i) }}
                          disabled={merging}
                          className="text-xs px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 shrink-0 flex items-center gap-1 disabled:opacity-50"
                        >
                          {merging ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                          Merge
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-3 pl-10 space-y-1">
                        {group.names.map((name, j) => {
                          const deal = deals.find((d) => d.company_name === name)
                          const isPrimary = name === group.primary && j === group.names.indexOf(group.primary)
                          return (
                            <div
                              key={j}
                              className={`flex items-center gap-3 text-sm py-1.5 px-2 rounded ${
                                isPrimary ? "bg-accent/10" : ""
                              }`}
                            >
                              <span className={`flex-1 ${isPrimary ? "font-medium text-accent" : "text-foreground/80"}`}>
                                {name}
                              </span>
                              {deal && (
                                <span className="text-xs px-2 py-0.5 rounded bg-card-bg text-muted">
                                  {STAGE_LABELS[deal.stage]}
                                </span>
                              )}
                              {isPrimary && (
                                <span className="text-xs text-accent">primary</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {groups && groups.length > 0 && mergedGroups.size < groups.length && (
          <div className="sticky bottom-0 bg-background border-t border-card-border px-6 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted">
              {mergedGroups.size} of {groups.length} groups merged
            </span>
            <button
              onClick={mergeAll}
              disabled={merging}
              className="text-sm px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
            >
              {merging && <Loader2 size={14} className="animate-spin" />}
              Merge All Remaining
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
