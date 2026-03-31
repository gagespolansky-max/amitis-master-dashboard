"use client"

import { useState } from "react"
import { Deal, STAGE_LABELS, PRIORITY_COLORS } from "@/lib/acio/types"
import { X, ArrowRight, Search, Loader2 } from "lucide-react"

interface MergeDialogProps {
  target: Deal
  source?: Deal
  allDeals?: Deal[]
  onMerge: (targetId: string, sourceId: string) => Promise<void>
  onClose: () => void
}

export default function MergeDialog({ target, source: initialSource, allDeals, onMerge, onClose }: MergeDialogProps) {
  const [source, setSource] = useState<Deal | null>(initialSource || null)
  const [search, setSearch] = useState("")
  const [merging, setMerging] = useState(false)
  const [swapped, setSwapped] = useState(false)

  const effectiveTarget = swapped && source ? source : target
  const effectiveSource = swapped && source ? target : source

  // Filter deals for the picker (exclude target, source, and dismissed)
  const pickable = (allDeals || []).filter(
    (d) => d.id !== target.id && d.status !== "dismissed" && d.company_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleMerge() {
    if (!effectiveSource) return
    setMerging(true)
    try {
      await onMerge(effectiveTarget.id, effectiveSource.id)
      onClose()
    } finally {
      setMerging(false)
    }
  }

  function DealPreview({ deal, label }: { deal: Deal; label: string }) {
    return (
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted uppercase tracking-wide mb-2">{label}</div>
        <div className="bg-card-bg border border-card-border rounded-lg p-4 space-y-3">
          <div className="font-medium">{deal.company_name}</div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">{STAGE_LABELS[deal.stage]}</span>
            <span className={`text-xs px-2 py-0.5 rounded border capitalize ${PRIORITY_COLORS[deal.priority]}`}>
              {deal.priority}
            </span>
            {deal.industry && <span className="text-xs text-muted">{deal.industry}</span>}
            {deal.investment_type && <span className="text-xs text-muted">{deal.investment_type}</span>}
          </div>

          {deal.company_description && (
            <div>
              <div className="text-xs text-muted mb-1">Description</div>
              <div className="text-sm text-foreground/80">{deal.company_description}</div>
            </div>
          )}

          {deal.value_proposition && (
            <div>
              <div className="text-xs text-muted mb-1">Value Proposition</div>
              <div className="text-sm text-foreground/80">{deal.value_proposition}</div>
            </div>
          )}

          {deal.key_contacts && deal.key_contacts.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1">Contacts ({deal.key_contacts.length})</div>
              <div className="space-y-0.5">
                {deal.key_contacts.map((c, i) => (
                  <div key={i} className="text-xs text-foreground/70">{c.name || c.email} <span className="text-muted">({c.role})</span></div>
                ))}
              </div>
            </div>
          )}

          {deal.notes && (
            <div>
              <div className="text-xs text-muted mb-1">Notes</div>
              <div className="text-xs text-foreground/60 line-clamp-3">{deal.notes}</div>
            </div>
          )}

          {deal.memo_url && (
            <div className="text-xs text-accent">Has investment memo</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background border border-card-border rounded-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-card-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Merge Deals</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {!source && !initialSource ? (
            // Deal picker mode
            <div>
              <p className="text-sm text-muted mb-3">
                Select a deal to merge into <strong>{target.company_name}</strong>:
              </p>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search deals..."
                  autoFocus
                  className="w-full bg-card-bg border border-card-border rounded-md pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {pickable.length === 0 && (
                  <div className="text-sm text-muted py-4 text-center">No matching deals</div>
                )}
                {pickable.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSource(d)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-card-bg flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{d.company_name}</div>
                      <div className="text-xs text-muted truncate">{d.company_description || d.source_subject || "—"}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent shrink-0">{STAGE_LABELS[d.stage]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : effectiveSource ? (
            // Preview mode
            <>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span>Source will be absorbed into target. Target keeps its name and deal card.</span>
              </div>

              <div className="flex gap-4 items-start">
                <DealPreview deal={effectiveTarget} label="Target (keeps)" />
                <div className="flex flex-col items-center justify-center py-8 shrink-0">
                  <ArrowRight size={20} className="text-muted rotate-180" />
                  <button
                    onClick={() => setSwapped(!swapped)}
                    className="text-xs text-accent hover:text-accent-hover mt-2"
                  >
                    Swap
                  </button>
                </div>
                <DealPreview deal={effectiveSource} label="Source (deleted)" />
              </div>

              {/* Merge preview */}
              <div className="bg-card-bg border border-card-border rounded-lg p-4">
                <div className="text-xs text-muted uppercase tracking-wide mb-2">After merge</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted text-xs">Contacts:</span>
                    <span className="ml-2">
                      {(() => {
                        const emails = new Set<string>()
                        const all = [...(effectiveTarget.key_contacts || []), ...(effectiveSource.key_contacts || [])]
                        return all.filter((c) => {
                          const key = c.email.toLowerCase()
                          if (emails.has(key)) return false
                          emails.add(key)
                          return true
                        }).length
                      })()}
                      {" "}total
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Priority:</span>
                    <span className="ml-2 capitalize">
                      {(() => {
                        const rank: Record<string, number> = { high: 3, medium: 2, low: 1 }
                        return (rank[effectiveSource.priority] || 2) > (rank[effectiveTarget.priority] || 2)
                          ? effectiveSource.priority : effectiveTarget.priority
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Description:</span>
                    <span className="ml-2">{effectiveTarget.company_description ? "Target" : effectiveSource.company_description ? "Source" : "None"}</span>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Notes:</span>
                    <span className="ml-2">{effectiveTarget.notes && effectiveSource.notes ? "Combined" : effectiveTarget.notes ? "Target" : effectiveSource.notes ? "Source" : "None"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                {!initialSource && (
                  <button
                    onClick={() => { setSource(null); setSwapped(false) }}
                    className="text-sm px-4 py-2 text-muted hover:text-foreground"
                  >
                    Pick different deal
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging}
                  className="text-sm px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2"
                >
                  {merging && <Loader2 size={14} className="animate-spin" />}
                  {merging ? "Merging..." : "Merge Deals"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
