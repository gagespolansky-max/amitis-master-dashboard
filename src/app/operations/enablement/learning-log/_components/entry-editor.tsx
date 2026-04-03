"use client"

import { useState, useEffect, useRef } from "react"
import { X, Eye, EyeOff, Plus, Upload, Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import { LearningLogEntry, DEFAULT_CATEGORIES } from "../_lib/learning-log-types"
import MarkdownRenderer from "./markdown-renderer"
import RefinementChat from "./refinement-chat"
import type { SuggestedUpdates } from "./refinement-chat"

interface EntryEditorProps {
  entry: LearningLogEntry
  allCategories: string[]
  onSave: (id: string, fields: Partial<LearningLogEntry>) => Promise<void>
  onClose: () => void
  onEntryUpdated?: (entry: LearningLogEntry) => void
  onProposedChanges?: (updates: SuggestedUpdates) => void
}

export default function EntryEditor({ entry, allCategories, onSave, onClose, onEntryUpdated, onProposedChanges }: EntryEditorProps) {
  const [concept, setConcept] = useState(entry.concept)
  const [explanation, setExplanation] = useState(entry.explanation)
  const [content, setContent] = useState(entry.content || "")
  const [context, setContext] = useState(entry.context || "")
  const [category, setCategory] = useState(entry.category)
  const [tagsInput, setTagsInput] = useState((entry.tags || []).join(", "))
  const [imageUrls, setImageUrls] = useState<string[]>(entry.image_urls || [])
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showRefinement, setShowRefinement] = useState(false)
  const [liveEntry, setLiveEntry] = useState<LearningLogEntry>(entry)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const changed =
      concept !== entry.concept ||
      explanation !== entry.explanation ||
      content !== (entry.content || "") ||
      context !== (entry.context || "") ||
      category !== entry.category ||
      tagsInput !== (entry.tags || []).join(", ") ||
      JSON.stringify(imageUrls) !== JSON.stringify(entry.image_urls || [])
    setDirty(changed)
  }, [concept, explanation, content, context, category, tagsInput, imageUrls, entry])

  function handleClose() {
    if (dirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  async function handleSave() {
    setSaving(true)
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    await onSave(entry.id, {
      concept,
      explanation,
      content: content || null,
      context: context || null,
      category,
      tags,
      image_urls: imageUrls,
    })
    setSaving(false)
    onClose()
  }

  async function handleAddScreenshots(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("id", entry.id)
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          formData.append("image", file)
        }
      }

      const res = await fetch(
        "/operations/enablement/learning-log/api/screenshot",
        { method: "PATCH", body: formData }
      )

      if (res.ok) {
        const updated: LearningLogEntry = await res.json()
        setImageUrls(updated.image_urls || [])
        onEntryUpdated?.(updated)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
      />

      {/* Slide-over panel */}
      <div className="fixed top-0 right-0 h-full w-[440px] max-w-full bg-background border-l border-card-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <h3 className="text-sm font-semibold">Edit Entry</h3>
          <button onClick={handleClose} className="text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Concept */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Concept</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full bg-card-bg border border-card-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Category</label>
            {addingCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder="new-category"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryInput.trim()) {
                      setCategory(newCategoryInput.trim())
                      setAddingCategory(false)
                      setNewCategoryInput("")
                    } else if (e.key === "Escape") {
                      setAddingCategory(false)
                      setNewCategoryInput("")
                    }
                  }}
                  className="flex-1 bg-card-bg border border-accent rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (newCategoryInput.trim()) {
                      setCategory(newCategoryInput.trim())
                      setAddingCategory(false)
                      setNewCategoryInput("")
                    }
                  }}
                  className="px-3 py-2 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent-hover"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingCategory(false); setNewCategoryInput("") }}
                  className="px-2 py-2 text-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={allCategories.includes(category) ? category : ""}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-card-bg border border-card-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  {!allCategories.includes(category) && (
                    <option value="" disabled>{category} (custom)</option>
                  )}
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => setAddingCategory(true)}
                  className="px-2 py-2 bg-card-bg border border-card-border rounded-md text-muted hover:text-foreground hover:border-accent"
                  title="Add new category"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Explanation (short summary) */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Summary (short)</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              className="w-full bg-card-bg border border-card-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Content (full markdown) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted">Full Article (Markdown)</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-muted hover:text-foreground flex items-center gap-1"
              >
                {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                {showPreview ? "Edit" : "Preview"}
              </button>
            </div>
            {showPreview ? (
              <div className="bg-card-bg border border-card-border rounded-md px-3 py-2 min-h-[280px] max-h-[500px] overflow-y-auto">
                {content ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-xs text-muted italic">No content to preview</p>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                placeholder="Write a full markdown article..."
                className="w-full bg-card-bg border border-card-border rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-accent resize-y min-h-[280px]"
              />
            )}
          </div>

          {/* Screenshots */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              Screenshots {imageUrls.length > 0 && `(${imageUrls.length})`}
            </label>
            {imageUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-md border border-card-border"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddScreenshots(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card-bg border border-dashed border-card-border rounded-md text-xs text-muted hover:text-foreground hover:border-accent disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload size={12} /> Add screenshot{imageUrls.length > 0 ? "s" : ""}
                </>
              )}
            </button>
          </div>

          {/* Context */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Context</label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Where did you learn this?"
              className="w-full bg-card-bg border border-card-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="supabase, rls, security"
              className="w-full bg-card-bg border border-card-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          {/* Refine with Claude */}
          <div className="border border-card-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowRefinement(!showRefinement)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted hover:text-foreground bg-card-bg hover:bg-card-border/30 transition-colors"
            >
              <MessageSquare size={14} className="text-accent" />
              <span>Refine with Claude</span>
              {liveEntry.is_verified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Verified</span>
              )}
              <div className="flex-1" />
              {showRefinement ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showRefinement && (
              <div className="border-t border-card-border h-[520px]">
                <RefinementChat
                  entry={liveEntry}
                  onEntryUpdated={(updated) => {
                    setLiveEntry(updated)
                    onEntryUpdated?.(updated)
                  }}
                  onVerified={() => {
                    onEntryUpdated?.(liveEntry)
                  }}
                  onProposedChanges={(updates) => {
                    onProposedChanges?.(updates)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-card-border flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-card-bg border border-card-border text-foreground rounded-md text-sm hover:bg-card-border"
          >
            Cancel
          </button>
        </div>

        {/* Discard confirmation */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
            <div className="bg-card-bg border border-card-border rounded-lg p-5 max-w-xs text-center space-y-3">
              <p className="text-sm font-medium">Discard changes?</p>
              <p className="text-xs text-muted">You have unsaved edits that will be lost.</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs font-medium hover:bg-red-500/30"
                >
                  Discard
                </button>
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 bg-card-border text-foreground rounded text-xs hover:bg-card-border/80"
                >
                  Keep editing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
