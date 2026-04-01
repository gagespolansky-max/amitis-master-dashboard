"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Deal, DealEmail, DealStage, DealPriority, STAGE_LABELS, PRIORITY_COLORS, INVESTMENT_TYPES, InvestmentType } from "../_lib/types"
import { X, ExternalLink, Upload, Trash2, Link2, FileText, Bell, Calendar, Merge, Sparkles, Loader2 } from "lucide-react"
import StageProgressBar from "./StageProgressBar"
import EmailThread from "./EmailThread"

interface DealPanelProps {
  deal: Deal
  onClose: () => void
  onUpdate: (updated: Deal) => void
  onDelete: (id: string) => void
  onMerge?: (deal: Deal) => void
}

export default function DealPanel({ deal, onClose, onUpdate, onDelete, onMerge }: DealPanelProps) {
  const [notes, setNotes] = useState(deal.notes || "")
  const [companyDescription, setCompanyDescription] = useState(deal.company_description || "")
  const [valueProp, setValueProp] = useState(deal.value_proposition || "")
  const [emails, setEmails] = useState<DealEmail[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [reminderDate, setReminderDate] = useState(deal.reminder_date?.slice(0, 10) || "")
  const [reminderNote, setReminderNote] = useState(deal.reminder_note || "")
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const descDebounceRef = useRef<NodeJS.Timeout>(null)
  const vpDebounceRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    setNotes(deal.notes || "")
    setCompanyDescription(deal.company_description || "")
    setValueProp(deal.value_proposition || "")
    setReminderDate(deal.reminder_date?.slice(0, 10) || "")
    setReminderNote(deal.reminder_note || "")
  }, [deal.id])

  useEffect(() => {
    fetch(`/acio/deals/api/${deal.id}/emails`)
      .then((r) => r.json())
      .then(setEmails)
      .catch(() => {})
  }, [deal.id])

  async function patchDeal(fields: Record<string, unknown>) {
    const res = await fetch(`/acio/deals/api/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
    }
  }

  function debouncedPatch(ref: React.RefObject<NodeJS.Timeout | null>, fields: Record<string, unknown>) {
    if (ref.current) clearTimeout(ref.current)
    ref.current = setTimeout(() => patchDeal(fields), 800)
  }

  async function changeStage(stage: DealStage) {
    await patchDeal({ stage })
  }

  async function changePriority(priority: DealPriority) {
    await patchDeal({ priority })
  }

  async function changeInvestmentType(type: string) {
    await patchDeal({ investment_type: type || null })
  }

  async function saveReminder() {
    await patchDeal({
      reminder_date: reminderDate ? new Date(reminderDate).toISOString() : null,
      reminder_note: reminderNote || null,
    })
  }

  async function uploadMemo(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`/acio/deals/api/${deal.id}/memo`, {
      method: "POST",
      body: formData,
    })
    if (res.ok) onUpdate(await res.json())
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await fetch(`/acio/deals/api/${deal.id}`, { method: "DELETE" })
    onDelete(deal.id)
  }

  async function handleEnrich() {
    setEnriching(true)
    try {
      const res = await fetch(`/acio/deals/api/${deal.id}/enrich`, { method: "POST" })
      if (res.ok) {
        const updated = await res.json()
        setCompanyDescription(updated.company_description || "")
        setValueProp(updated.value_proposition || "")
        onUpdate(updated)
      }
    } finally {
      setEnriching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border-l border-card-border overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-card-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{deal.company_name}</h2>
          <div className="flex items-center gap-2">
            {onMerge && (
              <button
                onClick={() => onMerge(deal)}
                className="text-xs px-2.5 py-1.5 text-purple-400 hover:bg-purple-500/20 rounded-md flex items-center gap-1"
              >
                <Merge size={14} /> Merge
              </button>
            )}
            <button onClick={onClose} className="text-muted hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Stage progress bar */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">Stage</label>
            <StageProgressBar
              stage={deal.stage}
              stageUpdatedAt={deal.stage_updated_at}
              onStageChange={changeStage}
            />
          </div>

          {/* Priority selector */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">Priority</label>
            <div className="flex gap-1.5">
              {(["high", "medium", "low"] as DealPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => changePriority(p)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    deal.priority === p
                      ? PRIORITY_COLORS[p]
                      : "border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {p === "high" ? "High" : p === "medium" ? "Medium" : "Low"}
                </button>
              ))}
            </div>
          </div>

          {/* Deal info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted text-xs block">Deal Type</span>
              <span>{deal.deal_type || "—"}</span>
            </div>
            <div>
              <span className="text-muted text-xs block">Source</span>
              <span className="capitalize">{deal.source.replace("_", " ")}</span>
            </div>
            <div>
              <span className="text-muted text-xs block">Investment Type</span>
              <select
                value={deal.investment_type || ""}
                onChange={(e) => changeInvestmentType(e.target.value)}
                className="bg-background border border-card-border rounded px-2 py-0.5 text-sm text-foreground mt-0.5"
              >
                <option value="">—</option>
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-muted text-xs block">Industry</span>
              <span>{deal.industry || "—"}</span>
            </div>
          </div>

          {/* Description section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
              {deal.industry && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{deal.industry}</span>
              )}
              {deal.investment_type && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{deal.investment_type}</span>
              )}
              </div>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="text-xs px-2.5 py-1.5 text-accent hover:bg-accent/10 rounded-md flex items-center gap-1 disabled:opacity-50"
              >
                {enriching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {enriching ? "Enriching..." : "Enrich with AI"}
              </button>
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1">Company Description</label>
              <textarea
                value={companyDescription}
                onChange={(e) => {
                  setCompanyDescription(e.target.value)
                  debouncedPatch(descDebounceRef, { company_description: e.target.value })
                }}
                placeholder="What does this company/fund do?"
                rows={2}
                className="w-full bg-card-bg border border-card-border rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-1">Value Proposition</label>
              <textarea
                value={valueProp}
                onChange={(e) => {
                  setValueProp(e.target.value)
                  debouncedPatch(vpDebounceRef, { value_proposition: e.target.value })
                }}
                placeholder="Why is this relevant to Amitis?"
                rows={2}
                className="w-full bg-card-bg border border-card-border rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Contact dates */}
          {(deal.first_contacted_at || deal.last_contacted_at) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted text-xs block">First Contacted</span>
                <span>{deal.first_contacted_at ? new Date(deal.first_contacted_at).toLocaleDateString() : "—"}</span>
              </div>
              <div>
                <span className="text-muted text-xs block">Last Contacted</span>
                <span>{deal.last_contacted_at ? new Date(deal.last_contacted_at).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          )}

          {/* Contacts */}
          {deal.key_contacts && deal.key_contacts.length > 0 && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wide block mb-2">Contacts</label>
              <div className="space-y-1">
                {deal.key_contacts.map((c, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span>{c.name || c.email}</span>
                    <span className="text-xs text-muted capitalize">({c.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email threads */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">Email Threads</label>
            <div className="space-y-2">
              {deal.source_thread_id && (
                <EmailThread
                  dealEmail={{
                    id: `source-${deal.id}`,
                    deal_id: deal.id,
                    thread_id: deal.source_thread_id,
                    subject: deal.source_subject,
                    last_message_date: deal.first_seen_at,
                    snippet: null,
                    participants: deal.key_contacts?.map((c) => ({ name: c.name, email: c.email })) || null,
                    created_at: deal.created_at,
                  }}
                  dealId={deal.id}
                />
              )}
              {emails
                .filter((e) => e.thread_id !== deal.source_thread_id)
                .map((e) => (
                  <EmailThread key={e.id} dealEmail={e} dealId={deal.id} />
                ))}
            </div>
            <button className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1 mt-2">
              <Link2 size={12} /> Link additional thread
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                debouncedPatch(debounceRef, { notes: e.target.value })
              }}
              placeholder="Add notes..."
              rows={4}
              className="w-full bg-card-bg border border-card-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">
              <Bell size={12} className="inline mr-1" />
              Reminder
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Calendar size={14} className="text-muted shrink-0" />
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="bg-card-bg border border-card-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>
              <input
                type="text"
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="Reminder note..."
                className="flex-1 bg-card-bg border border-card-border rounded-md px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={saveReminder}
                className="text-xs px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover"
              >
                Set
              </button>
            </div>
            {deal.reminder_date && (
              <div className="mt-1.5 text-xs text-muted">
                {new Date(deal.reminder_date).toLocaleDateString()}
                {deal.reminder_note && ` — ${deal.reminder_note}`}
              </div>
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">Investment Memo</label>
            {deal.memo_url ? (
              <div className="bg-card-bg border border-card-border rounded-lg p-3 flex items-center gap-3">
                <FileText size={18} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={deal.memo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:text-accent-hover truncate block"
                  >
                    {deal.memo_filename || "Download memo"}
                  </a>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 bg-card-bg border border-dashed border-card-border rounded-lg p-6 cursor-pointer hover:border-muted transition-colors">
                <Upload size={16} className="text-muted" />
                <span className="text-sm text-muted">{uploading ? "Uploading..." : "Upload memo"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xlsx,.pptx"
                  onChange={(e) => e.target.files?.[0] && uploadMemo(e.target.files[0])}
                />
              </label>
            )}
          </div>

          {/* Delete */}
          <div className="pt-4 border-t border-card-border">
            <button
              onClick={handleDelete}
              className={`text-sm inline-flex items-center gap-1.5 ${
                confirmDelete ? "text-danger" : "text-muted hover:text-danger"
              } transition-colors`}
            >
              <Trash2 size={14} />
              {confirmDelete ? "Click again to confirm delete" : "Delete deal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
