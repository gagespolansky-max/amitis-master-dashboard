"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Deal, DealEmail, DealAttachment, DealLink, DealStage, DealPriority, STAGE_LABELS, PRIORITY_COLORS, INDUSTRIES, DEAL_TYPES, VEHICLES, COMPANY_STAGES, DEAL_TYPE_LABELS, VEHICLE_LABELS, COMPANY_STAGE_LABELS } from "../_lib/types"
import { X, ExternalLink, Upload, Trash2, Link2, FileText, Bell, Calendar, Merge, Sparkles, Loader2, Pencil, Check, Search, ArrowRightLeft, Paperclip, Plus, Globe } from "lucide-react"
import { Droppable, Draggable } from "@hello-pangea/dnd"
import StageProgressBar from "./StageProgressBar"
import EmailThread from "./EmailThread"

interface DealPanelProps {
  deal: Deal
  allDeals: Deal[]
  onClose: () => void
  onUpdate: (updated: Deal) => void
  onDelete: (id: string) => void
  onMerge?: (deal: Deal) => void
  onEmailMoved?: () => void
}

export default function DealPanel({ deal, allDeals, onClose, onUpdate, onDelete, onMerge, onEmailMoved }: DealPanelProps) {
  const [notes, setNotes] = useState(deal.notes || "")
  const [companyDescription, setCompanyDescription] = useState(deal.company_description || "")
  const [valueProp, setValueProp] = useState(deal.value_proposition || "")
  const [emails, setEmails] = useState<DealEmail[]>([])
  const [attachments, setAttachments] = useState<DealAttachment[]>([])
  const [links, setLinks] = useState<DealLink[]>([])
  const [addingLink, setAddingLink] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [newLinkLabel, setNewLinkLabel] = useState("")
  const [savingLink, setSavingLink] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [reminderDate, setReminderDate] = useState(deal.reminder_date?.slice(0, 10) || "")
  const [reminderNote, setReminderNote] = useState(deal.reminder_note || "")
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(deal.company_name)
  const [movingEmail, setMovingEmail] = useState<DealEmail | null>(null)
  const [moveSearch, setMoveSearch] = useState("")
  const [moveLoading, setMoveLoading] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const descDebounceRef = useRef<NodeJS.Timeout>(null)
  const vpDebounceRef = useRef<NodeJS.Timeout>(null)
  const moveSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNotes(deal.notes || "")
    setCompanyDescription(deal.company_description || "")
    setValueProp(deal.value_proposition || "")
    setReminderDate(deal.reminder_date?.slice(0, 10) || "")
    setReminderNote(deal.reminder_note || "")
    setNameValue(deal.company_name)
    setEditingName(false)
    setMovingEmail(null)
    setAddingLink(false)
  }, [deal.id])

  const fetchEmails = useCallback(async () => {
    const r = await fetch(`/acio/deals/api/${deal.id}/emails`)
    if (r.ok) setEmails(await r.json())
  }, [deal.id])

  const fetchAttachments = useCallback(async () => {
    const r = await fetch(`/acio/deals/api/${deal.id}/attachments`)
    if (r.ok) setAttachments(await r.json())
  }, [deal.id])

  const fetchLinks = useCallback(async () => {
    const r = await fetch(`/acio/deals/api/${deal.id}/links`)
    if (r.ok) setLinks(await r.json())
  }, [deal.id])

  useEffect(() => {
    fetchEmails().catch(() => {})
    fetchAttachments().catch(() => {})
    fetchLinks().catch(() => {})
  }, [fetchEmails, fetchAttachments, fetchLinks])

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

  async function moveEmailToDeal(targetDealId: string) {
    if (!movingEmail) return
    setMoveLoading(true)
    try {
      const res = await fetch(`/acio/deals/api/${deal.id}/emails/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_deal_id: targetDealId,
          thread_id: movingEmail.thread_id,
          deal_email_id: movingEmail.id,
        }),
      })
      if (res.ok) {
        setMovingEmail(null)
        setMoveSearch("")
        await fetchEmails()
        // Refresh source deal if source thread was moved
        if (movingEmail.id.startsWith("source-")) {
          const dealRes = await fetch(`/acio/deals/api/${deal.id}`)
          if (dealRes.ok) onUpdate(await dealRes.json())
        }
        onEmailMoved?.()
      }
    } finally {
      setMoveLoading(false)
    }
  }

  async function addLink() {
    if (!newLinkUrl.trim()) return
    setSavingLink(true)
    try {
      const res = await fetch(`/acio/deals/api/${deal.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newLinkUrl.trim(), label: newLinkLabel.trim() || null }),
      })
      if (res.ok) {
        setNewLinkUrl("")
        setNewLinkLabel("")
        setAddingLink(false)
        await fetchLinks()
      }
    } finally {
      setSavingLink(false)
    }
  }

  async function deleteLink(linkId: string) {
    await fetch(`/acio/deals/api/${deal.id}/links`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: linkId }),
    })
    await fetchLinks()
  }

  // Build the full list of email items for drag support
  const allEmailItems: { dealEmail: DealEmail; isSource: boolean }[] = []
  if (deal.source_thread_id) {
    allEmailItems.push({
      isSource: true,
      dealEmail: {
        id: `source-${deal.id}`,
        deal_id: deal.id,
        thread_id: deal.source_thread_id,
        subject: deal.source_subject,
        last_message_date: deal.first_seen_at,
        snippet: null,
        participants: deal.key_contacts?.map((c) => ({ name: c.name, email: c.email })) || null,
        created_at: deal.created_at,
      },
    })
  }
  emails
    .filter((e) => e.thread_id !== deal.source_thread_id)
    .forEach((e) => allEmailItems.push({ isSource: false, dealEmail: e }))

  const moveTargets = allDeals
    .filter((d) => d.id !== deal.id && d.status !== "dismissed")
    .filter((d) => !moveSearch || d.company_name.toLowerCase().includes(moveSearch.toLowerCase()))
    .slice(0, 8)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border-l border-card-border overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-card-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            {editingName ? (
              <form
                className="flex items-center gap-1.5 flex-1 min-w-0"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const trimmed = nameValue.trim()
                  if (trimmed && trimmed !== deal.company_name) {
                    await patchDeal({ company_name: trimmed })
                  }
                  setEditingName(false)
                }}
              >
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={() => { setNameValue(deal.company_name); setEditingName(false) }}
                  className="text-lg font-semibold bg-card-bg border border-accent rounded px-2 py-0.5 flex-1 min-w-0 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  className="text-accent hover:text-accent-hover shrink-0"
                >
                  <Check size={18} />
                </button>
              </form>
            ) : (
              <>
                <h2 className="text-lg font-semibold truncate">{deal.company_name}</h2>
                <button
                  onClick={() => { setNameValue(deal.company_name); setEditingName(true) }}
                  className="text-muted hover:text-foreground shrink-0"
                  title="Rename deal"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
              <select
                value={deal.deal_type || ""}
                onChange={(e) => patchDeal({ deal_type: e.target.value || null })}
                className="bg-background border border-card-border rounded px-2 py-0.5 text-sm text-foreground mt-0.5"
              >
                <option value="">—</option>
                {DEAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-muted text-xs block">Source</span>
              <span className="capitalize">{deal.source.replace("_", " ")}</span>
            </div>
            {deal.deal_type && deal.deal_type !== "fund_allocation" && (
              <>
                <div>
                  <span className="text-muted text-xs block">Vehicle</span>
                  <select
                    value={deal.vehicle || ""}
                    onChange={(e) => patchDeal({ vehicle: e.target.value || null })}
                    className="bg-background border border-card-border rounded px-2 py-0.5 text-sm text-foreground mt-0.5"
                  >
                    <option value="">—</option>
                    {VEHICLES.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-muted text-xs block">Company Stage</span>
                  <select
                    value={deal.company_stage || ""}
                    onChange={(e) => patchDeal({ company_stage: e.target.value || null })}
                    className="bg-background border border-card-border rounded px-2 py-0.5 text-sm text-foreground mt-0.5"
                  >
                    <option value="">—</option>
                    {COMPANY_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <span className="text-muted text-xs block">Industry</span>
              <select
                value={deal.industry && INDUSTRIES.includes(deal.industry) ? deal.industry : deal.industry ? "__custom" : ""}
                onChange={(e) => {
                  if (e.target.value === "__custom") return
                  patchDeal({ industry: e.target.value || null })
                }}
                className="bg-background border border-card-border rounded px-2 py-0.5 text-sm text-foreground mt-0.5"
              >
                <option value="">—</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
                {deal.industry && !INDUSTRIES.includes(deal.industry) && (
                  <option value="__custom">{deal.industry}</option>
                )}
              </select>
              {deal.industry && !INDUSTRIES.includes(deal.industry) && (
                <input
                  type="text"
                  defaultValue={deal.industry}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== deal.industry) patchDeal({ industry: v })
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                  className="bg-background border border-card-border rounded px-2 py-0.5 text-sm text-foreground mt-1 w-full focus:outline-none focus:border-accent"
                  placeholder="Custom industry..."
                />
              )}
            </div>
          </div>

          {/* Description section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
              {deal.industry && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{deal.industry}</span>
              )}
              {deal.vehicle && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{VEHICLE_LABELS[deal.vehicle]}</span>
              )}
              {deal.company_stage && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{COMPANY_STAGE_LABELS[deal.company_stage]}</span>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted uppercase tracking-wide">
                Email Threads ({allEmailItems.length})
              </label>
              <button className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1">
                <Link2 size={12} /> Link thread
              </button>
            </div>

            {/* Move-to-deal picker */}
            {movingEmail && (
              <div className="mb-3 bg-card-bg border border-accent/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRightLeft size={14} className="text-accent" />
                    <span>Move &quot;{movingEmail.subject || "thread"}&quot; to:</span>
                  </div>
                  <button
                    onClick={() => { setMovingEmail(null); setMoveSearch("") }}
                    className="text-muted hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={moveSearchRef}
                    type="text"
                    value={moveSearch}
                    onChange={(e) => setMoveSearch(e.target.value)}
                    placeholder="Search deals..."
                    className="w-full bg-background border border-card-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {moveTargets.length === 0 ? (
                    <div className="text-xs text-muted py-2 text-center">No matching deals</div>
                  ) : (
                    moveTargets.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => moveEmailToDeal(d.id)}
                        disabled={moveLoading}
                        className="w-full text-left px-2.5 py-2 rounded-md text-sm hover:bg-accent/10 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
                      >
                        <span className="truncate">{d.company_name}</span>
                        <span className="text-xs text-muted shrink-0">{STAGE_LABELS[d.stage]}</span>
                      </button>
                    ))
                  )}
                </div>
                {moveLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Loader2 size={12} className="animate-spin" /> Moving...
                  </div>
                )}
              </div>
            )}

            <Droppable droppableId="panel-emails" type="EMAIL" isDropDisabled>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {allEmailItems.map((item, index) => (
                    <Draggable
                      key={item.dealEmail.id}
                      draggableId={`email-${item.dealEmail.id}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? "opacity-50" : ""}
                        >
                          <EmailThread
                            dealEmail={item.dealEmail}
                            dealId={deal.id}
                            onMove={(de) => { setMovingEmail(de); setMoveSearch(""); setTimeout(() => moveSearchRef.current?.focus(), 50) }}
                            onMessagesLoaded={() => { fetchAttachments(); fetchLinks() }}
                            showDragHandle
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {allEmailItems.length === 0 && (
                    <div className="text-xs text-muted py-3 text-center bg-card-bg border border-card-border rounded-lg">
                      No email threads linked to this deal
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Attachments */}
          {(() => {
            const filtered = attachments.filter((att) => !(/^image\d{3}\.(png|jpe?g|gif|bmp)$/i.test(att.filename)))
            return filtered.length > 0 ? (
              <div>
                <label className="text-xs text-muted uppercase tracking-wide block mb-2">
                  <Paperclip size={12} className="inline mr-1" />
                  Attachments ({filtered.length})
                </label>
                <div className="space-y-1">
                  {filtered.map((att) => (
                    <a
                      key={att.id}
                      href={`https://mail.google.com/mail/u/0/#inbox/${att.gmail_message_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg hover:border-accent/50 transition-colors group"
                    >
                      <FileText size={16} className="text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{att.filename}</div>
                        <div className="text-xs text-muted">
                          {att.size < 1024
                            ? `${att.size} B`
                            : att.size < 1048576
                            ? `${(att.size / 1024).toFixed(1)} KB`
                            : `${(att.size / 1048576).toFixed(1)} MB`}
                        </div>
                      </div>
                      <ExternalLink size={14} className="text-muted group-hover:text-accent shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted uppercase tracking-wide">
                <Globe size={12} className="inline mr-1" />
                Links ({links.length})
              </label>
              <button
                onClick={() => setAddingLink(!addingLink)}
                className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add link
              </button>
            </div>

            {addingLink && (
              <div className="mb-2 bg-card-bg border border-card-border rounded-lg p-3 space-y-2">
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-background border border-card-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") addLink() }}
                />
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Label (optional) — e.g. Data Room, Pitch Deck"
                  className="w-full bg-background border border-card-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                  onKeyDown={(e) => { if (e.key === "Enter") addLink() }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setAddingLink(false); setNewLinkUrl(""); setNewLinkLabel("") }}
                    className="text-xs px-3 py-1.5 text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addLink}
                    disabled={!newLinkUrl.trim() || savingLink}
                    className="text-xs px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1"
                  >
                    {savingLink && <Loader2 size={12} className="animate-spin" />}
                    Add
                  </button>
                </div>
              </div>
            )}

            {links.length > 0 ? (
              <div className="space-y-1">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2.5 px-3 py-2 bg-card-bg border border-card-border rounded-lg group"
                  >
                    <Globe size={14} className="text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent hover:text-accent-hover truncate block"
                      >
                        {link.label || link.url.replace(/^https?:\/\//, "").slice(0, 50)}
                      </a>
                      {link.label && (
                        <div className="text-xs text-muted truncate">
                          {link.url.replace(/^https?:\/\//, "").slice(0, 60)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {link.source === "auto" && (
                        <span className="text-[10px] text-muted bg-card-border/30 px-1.5 py-0.5 rounded">auto</span>
                      )}
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                        title="Remove link"
                      >
                        <Trash2 size={12} />
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-accent p-0.5"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : !addingLink ? (
              <div className="text-xs text-muted py-3 text-center bg-card-bg border border-card-border rounded-lg">
                No links yet — expand email threads to auto-detect, or add manually
              </div>
            ) : null}
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
