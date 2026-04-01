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

interface StructuredAnalysis {
  summary: string
  sender: string
  action_items: string[]
  details: string[]
  source_app: string
}

interface OcrCardProps {
  entry: ScreenshotEntry
  onUpdate: (id: string, updates: Partial<ScreenshotEntry>) => void
  onDelete: (id: string) => void
}

function tryParseAnalysis(text: string): StructuredAnalysis | null {
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed.summary === 'string') return parsed
    return null
  } catch {
    return null
  }
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

const SOURCE_COLORS: Record<string, string> = {
  Slack: 'bg-[#4A154B]/20 text-[#E01E5A] border-[#4A154B]/30',
  Teams: 'bg-[#464EB8]/20 text-[#7B83EB] border-[#464EB8]/30',
  Email: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  iMessage: 'bg-green-500/10 text-green-400 border-green-500/20',
  WhatsApp: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Excel: 'bg-green-600/10 text-green-500 border-green-600/20',
  Web: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

function SourceBadge({ source }: { source: string }) {
  if (!source || source === 'Unknown') return null
  const colors = SOURCE_COLORS[source] || 'bg-white/5 text-muted border-white/10'
  return (
    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors}`}>
      {source}
    </span>
  )
}

function StructuredContent({ analysis }: { analysis: StructuredAnalysis }) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <p className="text-sm text-foreground/90 leading-relaxed">{analysis.summary}</p>

      {/* Action items */}
      {analysis.action_items.length > 0 && (
        <div className="rounded-lg bg-accent/[0.06] border border-accent/[0.12] px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-accent uppercase tracking-wider">Action Items</span>
          </div>
          <ul className="space-y-1.5">
            {analysis.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-accent/60 mt-0.5 shrink-0">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Details */}
      {analysis.details.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {analysis.details.map((detail, i) => (
            <span
              key={i}
              className="inline-flex items-center text-xs text-muted bg-white/[0.04] border border-white/[0.06] rounded-md px-2.5 py-1"
            >
              {detail}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PlainTextContent({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-4 py-3">
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{block}</p>
        </div>
      ))}
    </div>
  )
}

export default function OcrCard({ entry, onUpdate, onDelete }: OcrCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(entry.edited_text)
  const [description, setDescription] = useState(entry.description)
  const [dateLabel, setDateLabel] = useState(entry.date_label)
  const [showImage, setShowImage] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const analysis = useMemo(() => tryParseAnalysis(entry.extracted_text), [entry.extracted_text])

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
          {analysis?.source_app && !isEditing && <SourceBadge source={analysis.source_app} />}
          {analysis?.sender && !isEditing && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-sm text-muted">from {analysis.sender}</span>
            </>
          )}
          {!analysis && description && !isEditing && (
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
        <div className="px-5 pb-4">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40"
              />
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground font-mono leading-relaxed resize-y"
              />
            </div>
          ) : analysis ? (
            <StructuredContent analysis={analysis} />
          ) : (
            <PlainTextContent text={editedText || entry.extracted_text} />
          )}
        </div>
      )}
    </div>
  )
}
