'use client'

import { useState } from 'react'

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

export default function OcrCard({ entry, onUpdate, onDelete }: OcrCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(entry.edited_text)
  const [description, setDescription] = useState(entry.description)
  const [dateLabel, setDateLabel] = useState(entry.date_label)
  const [showImage, setShowImage] = useState(false)

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
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              type="date"
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-foreground"
            />
          ) : (
            <span className="text-sm text-muted">
              {dateLabel || new Date(entry.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImage(!showImage)}
            className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            {showImage ? 'Hide' : 'Show'} image
          </button>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="text-xs text-accent hover:text-accent/80 transition-colors px-2 py-1 rounded hover:bg-accent/10"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Screenshot preview */}
      {showImage && (
        <div className="border-b border-white/5 p-3 bg-black/20">
          <img
            src={entry.image_url}
            alt="Screenshot"
            className="max-h-64 rounded-lg mx-auto"
          />
        </div>
      )}

      {/* Description */}
      <div className="px-4 py-3 border-b border-white/5">
        {isEditing ? (
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted/40"
          />
        ) : (
          <p className="text-sm text-muted italic">
            {description || 'No description'}
          </p>
        )}
      </div>

      {/* Extracted text */}
      <div className="px-4 py-3">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-foreground font-mono leading-relaxed resize-y"
          />
        ) : (
          <pre className="text-sm text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed">
            {editedText || entry.extracted_text}
          </pre>
        )}
      </div>
    </div>
  )
}
