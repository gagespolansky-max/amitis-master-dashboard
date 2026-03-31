"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Deal, DealEmail, DealStage, STAGES, STAGE_LABELS } from "@/lib/acio/types"
import { X, ExternalLink, Upload, Trash2, Link2, FileText } from "lucide-react"

interface DealPanelProps {
  deal: Deal
  onClose: () => void
  onUpdate: (updated: Deal) => void
  onDelete: (id: string) => void
}

export default function DealPanel({ deal, onClose, onUpdate, onDelete }: DealPanelProps) {
  const [notes, setNotes] = useState(deal.notes || "")
  const [emails, setEmails] = useState<DealEmail[]>([])
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    fetch(`/api/acio/deals/${deal.id}/emails`)
      .then((r) => r.json())
      .then(setEmails)
      .catch(() => {})
  }, [deal.id])

  const saveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const res = await fetch(`/api/acio/deals/${deal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        })
        if (res.ok) {
          const updated = await res.json()
          onUpdate(updated)
        }
      }, 800)
    },
    [deal.id, onUpdate]
  )

  async function changeStage(stage: DealStage) {
    const res = await fetch(`/api/acio/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    })
    if (res.ok) onUpdate(await res.json())
  }

  async function uploadMemo(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`/api/acio/deals/${deal.id}/memo`, {
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
    await fetch(`/api/acio/deals/${deal.id}`, { method: "DELETE" })
    onDelete(deal.id)
  }

  const gmailLink = deal.source_thread_id
    ? `https://mail.google.com/mail/u/0/#inbox/${deal.source_thread_id}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border-l border-card-border overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-card-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{deal.company_name}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Stage selector */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-2">Stage</label>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStage(s)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    deal.stage === s
                      ? "bg-accent text-white border-accent"
                      : "border-card-border text-muted hover:text-foreground hover:border-muted"
                  }`}
                >
                  {STAGE_LABELS[s]}
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
          </div>

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
            {deal.source_subject && (
              <div className="bg-card-bg border border-card-border rounded-lg p-3 mb-2">
                <div className="text-sm font-medium">{deal.source_subject}</div>
                {gmailLink && (
                  <a
                    href={gmailLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1 mt-1"
                  >
                    View in Gmail <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
            {emails.map((e) => (
              <div key={e.id} className="bg-card-bg border border-card-border rounded-lg p-3 mb-2">
                <div className="text-sm font-medium">{e.subject || "No subject"}</div>
                {e.snippet && <div className="text-xs text-muted mt-1 line-clamp-2">{e.snippet}</div>}
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${e.thread_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1 mt-1"
                >
                  View in Gmail <ExternalLink size={12} />
                </a>
              </div>
            ))}
            <button className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1 mt-1">
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
                saveNotes(e.target.value)
              }}
              placeholder="Add notes..."
              rows={4}
              className="w-full bg-card-bg border border-card-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:border-accent"
            />
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
