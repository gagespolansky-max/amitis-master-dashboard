'use client'

import { useState, useMemo } from 'react'

export interface ScreenshotEntry {
  id: string
  image_url: string
  extracted_text: string
  edited_text: string
  description: string
  date_label: string
  created_at: string
}

interface OcrCardProps {
  entry: ScreenshotEntry
  onUpdate: (id: string, updates: Partial<ScreenshotEntry>) => void
  onDelete: (id: string) => void
}

function parseTextBlocks(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
}

function formatDate(dateLabel: string, createdAt: string): string {
  const raw = dateLabel || createdAt
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return raw
  }
}

export default function OcrCard({ entry, onUpdate, onDelete }: OcrCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(entry.edited_text)
  const [description, setDescription] = useState(entry.description)
  const [dateLabel, setDateLabel] = useState(entry.date_label)
  const [showImage, setShowImage] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const displayText = editedText || entry.extracted_text
  const blocks = useMemo(() => parseTextBlocks(displayText), [displayText])

  const handleSave = () => {
    onUpdate(entry.id, {
      edited_text: editedText,
      description,
      date_label: dateLabel,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedText(entry.edited_text)
    setDescription(entry.description)
    setDateLabel(entry.date_label)
    setIsEditing(false)
  }

  return (
    <div className="group rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02] overflow-hidden transition-all hover:border-white/[0.12]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted/60 hover:text-foreground transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {isEditing ? (
            <input
              type="date"
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-sm text-foreground"
            />
          ) : (
            <span className="text-sm font-medium text-foreground/90">
              {formatDate(dateLabel, entry.created_at)}
            </span>
          )}
          {description && !isEditing && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-sm text-muted">{description}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowImage(!showImage)}
            className="text-xs text-muted hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            {showImage ? 'Hide' : 'Show'} image
          </button>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-accent/10"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="text-xs text-muted hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-400/50 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-400/10"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Screenshot preview */}
      {showImage && (
        <div className="mx-5 mb-4 rounded-lg overflow-hidden bg-black/30 border border-white/5">
          <img
            src={entry.image_url}
            alt="Screenshot"
            className="max-h-72 mx-auto"
          />
        </div>
      )}

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-5 pb-4 space-y-3">
          {/* Description (edit mode) */}
          {isEditing && (
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40"
            />
          )}

          {/* Extracted text */}
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={10}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground font-mono leading-relaxed resize-y"
            />
          ) : (
            <div className="space-y-2">
              {blocks.map((block, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-4 py-3"
                >
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {block}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
