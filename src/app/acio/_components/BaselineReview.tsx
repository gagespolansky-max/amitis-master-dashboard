"use client"

import { useState } from "react"
import { Deal, DealStage, DealPriority, STAGES, STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS } from "../_lib/types"
import { Check, X, Merge } from "lucide-react"

interface DealOverrides {
  deal_type?: string
  stage?: DealStage
  priority?: DealPriority
}

interface BaselineReviewProps {
  deals: Deal[]
  onConfirm: (ids: string[], overrides?: Record<string, DealOverrides>) => void
  onDismiss: (ids: string[]) => void
  onFinish: () => void
  onMerge?: (target: Deal, source: Deal) => void
}

const DEAL_TYPES = ["Series A", "Series B", "Series C", "Fund Allocation", "Co-Invest", "Direct", "Seed", "Other"]

export default function BaselineReview({ deals, onConfirm, onDismiss, onFinish, onMerge }: BaselineReviewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, DealOverrides>>({})

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === deals.length) setSelected(new Set())
    else setSelected(new Set(deals.map((d) => d.id)))
  }

  function setOverride(dealId: string, field: keyof DealOverrides, value: string) {
    setOverrides((prev) => ({
      ...prev,
      [dealId]: { ...prev[dealId], [field]: value },
    }))
  }

  function getField<K extends keyof DealOverrides>(deal: Deal, field: K): string {
    return (overrides[deal.id]?.[field] as string) ?? (deal[field] as string) ?? ""
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Baseline Review</h2>
          <p className="text-sm text-muted">{deals.length} deals need review from the initial scan</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              {selected.size === 2 && onMerge && (
                <button
                  onClick={() => {
                    const ids = Array.from(selected)
                    const target = deals.find((d) => d.id === ids[0])!
                    const source = deals.find((d) => d.id === ids[1])!
                    onMerge(target, source)
                  }}
                  className="text-sm px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 flex items-center gap-1.5"
                >
                  <Merge size={14} /> Merge
                </button>
              )}
              <button
                onClick={() => {
                  onConfirm(Array.from(selected), overrides)
                  setSelected(new Set())
                }}
                className="text-sm px-3 py-1.5 bg-success/20 text-success rounded-md hover:bg-success/30"
              >
                Confirm {selected.size}
              </button>
              <button
                onClick={() => {
                  onDismiss(Array.from(selected))
                  setSelected(new Set())
                }}
                className="text-sm px-3 py-1.5 bg-danger/20 text-danger rounded-md hover:bg-danger/30"
              >
                Dismiss {selected.size}
              </button>
            </>
          )}
          <button
            onClick={onFinish}
            className="text-sm px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover"
          >
            Finish Review
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 text-xs text-muted uppercase tracking-wide">
          <div className="w-6">
            <input
              type="checkbox"
              checked={selected.size === deals.length && deals.length > 0}
              onChange={toggleAll}
              className="accent-accent"
            />
          </div>
          <div className="flex-1">Deal</div>
          <div className="w-36">Type</div>
          <div className="w-36">Stage</div>
          <div className="w-24">Priority</div>
          <div className="w-20">Actions</div>
        </div>

        {/* Rows */}
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="bg-card-bg border border-card-border rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-6">
                <input
                  type="checkbox"
                  checked={selected.has(deal.id)}
                  onChange={() => toggleSelect(deal.id)}
                  className="accent-accent"
                />
              </div>

              {/* Company + description */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{deal.company_name}</div>
                <div className="text-xs text-muted truncate mt-0.5">
                  {deal.source_subject || "—"}
                </div>
                {(deal.company_description || deal.industry) && (
                  <div className="text-xs text-muted/70 mt-1 flex gap-2">
                    {deal.industry && (
                      <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded">{deal.industry}</span>
                    )}
                    {deal.investment_type && (
                      <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">{deal.investment_type}</span>
                    )}
                  </div>
                )}
                {deal.company_description && (
                  <div className="text-xs text-muted/60 mt-1 line-clamp-1">{deal.company_description}</div>
                )}
              </div>

              {/* Deal type dropdown */}
              <div className="w-36">
                <select
                  value={getField(deal, "deal_type")}
                  onChange={(e) => setOverride(deal.id, "deal_type", e.target.value)}
                  className="w-full bg-background border border-card-border rounded-md px-2 py-1 text-xs text-foreground"
                >
                  <option value="">—</option>
                  {DEAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Stage dropdown */}
              <div className="w-36">
                <select
                  value={getField(deal, "stage")}
                  onChange={(e) => setOverride(deal.id, "stage", e.target.value)}
                  className="w-full bg-background border border-card-border rounded-md px-2 py-1 text-xs text-foreground"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Priority buttons */}
              <div className="w-24 flex gap-1">
                {(["high", "medium", "low"] as DealPriority[]).map((p) => {
                  const current = getField(deal, "priority") || "medium"
                  const active = current === p
                  return (
                    <button
                      key={p}
                      onClick={() => setOverride(deal.id, "priority", p)}
                      className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                        active ? PRIORITY_COLORS[p] : "border-card-border text-muted hover:text-foreground"
                      }`}
                    >
                      {p[0].toUpperCase()}
                    </button>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="w-20 flex gap-1 justify-end">
                <button
                  onClick={() => onConfirm([deal.id], overrides)}
                  className="p-1.5 text-success hover:bg-success/20 rounded"
                  title="Confirm"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => onDismiss([deal.id])}
                  className="p-1.5 text-danger hover:bg-danger/20 rounded"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
