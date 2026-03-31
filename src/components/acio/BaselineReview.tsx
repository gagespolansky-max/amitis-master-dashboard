"use client"

import { useState } from "react"
import { Deal } from "@/lib/acio/types"
import { Check, X } from "lucide-react"

interface BaselineReviewProps {
  deals: Deal[]
  onConfirm: (ids: string[]) => void
  onDismiss: (ids: string[]) => void
  onFinish: () => void
}

export default function BaselineReview({ deals, onConfirm, onDismiss, onFinish }: BaselineReviewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

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
              <button
                onClick={() => {
                  onConfirm(Array.from(selected))
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

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border text-left text-muted">
            <th className="pb-2 pr-4 w-8">
              <input
                type="checkbox"
                checked={selected.size === deals.length && deals.length > 0}
                onChange={toggleAll}
                className="accent-accent"
              />
            </th>
            <th className="pb-2 pr-4">Company</th>
            <th className="pb-2 pr-4">Deal Type</th>
            <th className="pb-2 pr-4">Subject</th>
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-b border-card-border/50 hover:bg-card-bg/50">
              <td className="py-2 pr-4">
                <input
                  type="checkbox"
                  checked={selected.has(deal.id)}
                  onChange={() => toggleSelect(deal.id)}
                  className="accent-accent"
                />
              </td>
              <td className="py-2 pr-4 font-medium">{deal.company_name}</td>
              <td className="py-2 pr-4 text-muted">{deal.deal_type || "—"}</td>
              <td className="py-2 pr-4 text-muted truncate max-w-[200px]">{deal.source_subject || "—"}</td>
              <td className="py-2 pr-4 text-muted">
                {new Date(deal.first_seen_at).toLocaleDateString()}
              </td>
              <td className="py-2 flex gap-1">
                <button
                  onClick={() => onConfirm([deal.id])}
                  className="p-1 text-success hover:bg-success/20 rounded"
                  title="Confirm"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => onDismiss([deal.id])}
                  className="p-1 text-danger hover:bg-danger/20 rounded"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
