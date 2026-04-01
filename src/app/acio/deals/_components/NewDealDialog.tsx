"use client"

import { useState } from "react"
import { Deal, DealStage, DealPriority, STAGE_LABELS, STAGES, INDUSTRIES, DEAL_TYPES, VEHICLES, COMPANY_STAGES } from "../_lib/types"
import { X, Loader2 } from "lucide-react"

interface NewDealDialogProps {
  onClose: () => void
  onCreate: (deal: Deal) => void
}

export default function NewDealDialog({ onClose, onCreate }: NewDealDialogProps) {
  const [companyName, setCompanyName] = useState("")
  const [dealType, setDealType] = useState("")
  const [industry, setIndustry] = useState("")
  const [vehicle, setVehicle] = useState("")
  const [companyStage, setCompanyStage] = useState("")
  const [stage, setStage] = useState<DealStage>("sourced")
  const [priority, setPriority] = useState<DealPriority>("medium")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) return

    setSaving(true)
    try {
      const res = await fetch("/acio/deals/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          deal_type: dealType || null,
          industry: industry || null,
          vehicle: vehicle || null,
          company_stage: companyStage || null,
          stage,
          priority,
          notes: notes || null,
          source: "label",
          status: "confirmed",
        }),
      })
      if (res.ok) {
        const deal = await res.json()
        onCreate(deal)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-card-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <h2 className="text-lg font-semibold">New Deal</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Citadel, Bridgewater Associates"
              className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1">Deal Type</label>
              <select
                value={dealType}
                onChange={(e) => { setDealType(e.target.value); if (e.target.value === "fund_allocation") { setVehicle(""); setCompanyStage("") } }}
                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              >
                <option value="">—</option>
                {DEAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              >
                <option value="">—</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          {dealType && dealType !== "fund_allocation" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted uppercase tracking-wide block mb-1">Vehicle</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="">—</option>
                  {VEHICLES.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wide block mb-1">Company Stage</label>
                <select
                  value={companyStage}
                  onChange={(e) => setCompanyStage(e.target.value)}
                  className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="">—</option>
                  {COMPANY_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1">Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as DealStage)}
                className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1">Priority</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as DealPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    priority === p
                      ? p === "high" ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : p === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      : "border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {p === "high" ? "High" : p === "medium" ? "Medium" : "Low"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial notes, context, or next steps..."
              rows={3}
              className="w-full bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 text-muted hover:text-foreground rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!companyName.trim() || saving}
              className="text-sm px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Create Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
