'use client'

import { useState, useRef, useEffect } from 'react'
import { ExternalLink, FileText, Check, X } from 'lucide-react'

export interface CardMeta {
  displayTitle: string
  useCase: string
  illustrates: string
  whyCare: string
}

interface CollateralCardProps {
  title: string
  path: string
  fileType: string
  modified: string
  dropboxUrl: string | null
  initialMeta?: CardMeta
}

const EMPTY_META: CardMeta = { displayTitle: '', useCase: '', illustrates: '', whyCare: '' }

const META_FIELDS: { key: keyof CardMeta; label: string; placeholder: string }[] = [
  { key: 'useCase', label: 'Use Case', placeholder: 'e.g. LP meetings, due diligence, board presentations' },
  { key: 'illustrates', label: 'What It Illustrates', placeholder: 'e.g. Strategy performance across market cycles' },
  { key: 'whyCare', label: 'Why Investors Care', placeholder: 'e.g. Demonstrates uncorrelated alpha generation' },
]

const fileTypeBadge: Record<string, { label: string; className: string }> = {
  PDF: { label: 'PDF', className: 'bg-red-500/20 text-red-400 border border-red-500/20' },
  PowerPoint: { label: 'PPTX', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/20' },
  Excel: { label: 'XLSX', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' },
  Word: { label: 'DOCX', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/20' },
  Image: { label: 'IMG', className: 'bg-violet-500/20 text-violet-400 border border-violet-500/20' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CollateralCard({ title, path, fileType, modified, dropboxUrl, initialMeta }: CollateralCardProps) {
  const [imgError, setImgError] = useState(false)
  const [meta, setMeta] = useState<CardMeta>(initialMeta || EMPTY_META)
  const [editingField, setEditingField] = useState<keyof CardMeta | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const thumbnailSrc = `/investor-relations/marketing-collaterals/api/thumbnail?path=${encodeURIComponent(path)}`
  const badge = fileTypeBadge[fileType] || { label: fileType, className: 'bg-muted/20 text-muted border border-muted/20' }
  const displayTitle = meta.displayTitle || title

  useEffect(() => {
    setMeta(initialMeta || EMPTY_META)
  }, [initialMeta])

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      if (editingField === 'displayTitle') {
        inputRef.current.select()
      }
    }
  }, [editingField])

  async function handleSaveField() {
    if (!editingField) return
    const updated = { ...meta, [editingField]: draftValue.trim() }
    setMeta(updated)
    setEditingField(null)

    try {
      await fetch('/investor-relations/marketing-collaterals/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dropboxPath: path,
          displayTitle: updated.displayTitle,
          useCase: updated.useCase,
          illustrates: updated.illustrates,
          whyCare: updated.whyCare,
        }),
      })
    } catch (err) {
      console.error('Failed to save metadata:', err)
    }
  }

  function handleCancelField() {
    setEditingField(null)
  }

  function startEditing(field: keyof CardMeta) {
    if (field === 'displayTitle') {
      setDraftValue(meta.displayTitle || title)
    } else {
      setDraftValue(meta[field])
    }
    setEditingField(field)
  }

  return (
    <div className="group bg-card-bg border border-card-border rounded-lg overflow-hidden hover:border-accent/40 hover:shadow-[0_6px_24px_rgba(99,102,241,0.12)] transition-all duration-200 flex flex-col">
      {/* Thumbnail — inset with dark border */}
      <div className="p-3 bg-[#0a0b0f]">
        <a
          href={dropboxUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative rounded-md overflow-hidden border border-white/[0.06]"
        >
          <div className="aspect-[4/3] bg-[#1a1b23] flex items-center justify-center overflow-hidden">
            {imgError ? (
              <FileText className="w-8 h-8 text-muted/30" />
            ) : (
              <img
                src={thumbnailSrc}
                alt={displayTitle}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
            )}
          </div>
          {/* Gradient overlay at bottom of thumbnail */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          {/* File type badge — bottom-right corner of thumbnail */}
          <span className={`absolute bottom-2 right-2 text-[9px] font-bold tracking-wider uppercase px-1.5 py-px rounded-full backdrop-blur-sm ${badge.className}`}>
            {badge.label}
          </span>
        </a>
      </div>

      {/* Title + date */}
      <div className="px-4 pt-3 pb-0">
        {editingField === 'displayTitle' ? (
          <div className="flex items-center gap-1.5 mb-2.5">
            <input
              ref={inputRef}
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveField()
                if (e.key === 'Escape') handleCancelField()
              }}
              className="flex-1 min-w-0 text-lg font-semibold bg-background border border-card-border rounded-md px-2 py-1 focus:outline-none focus:border-accent"
            />
            <button onClick={handleSaveField} className="p-0.5 text-success hover:text-success/80">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleCancelField} className="p-0.5 text-muted hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <h3
              onClick={() => startEditing('displayTitle')}
              className="text-lg font-semibold leading-snug tracking-tight flex-1 line-clamp-2 cursor-pointer hover:text-foreground/80 transition-colors"
            >
              {displayTitle}
            </h3>
            <span className="text-sm text-muted/40 shrink-0 mt-0.5">{formatDate(modified)}</span>
          </div>
        )}
      </div>

      {/* Structured fields */}
      <div className="px-4 pb-3.5 space-y-2.5 flex-1">
        {META_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            {editingField === key ? (
              <div>
                <span className="text-sm uppercase tracking-wide font-semibold text-foreground/50 block mb-0.5">{label}</span>
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveField()
                      if (e.key === 'Escape') handleCancelField()
                    }}
                    placeholder={placeholder}
                    className="flex-1 min-w-0 text-base bg-background border border-card-border rounded-md px-2 py-1 focus:outline-none focus:border-accent placeholder:text-muted/30"
                  />
                  <button onClick={handleSaveField} className="p-0.5 text-success hover:text-success/80">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleCancelField} className="p-0.5 text-muted hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => startEditing(key)}
                className="cursor-pointer group/field"
              >
                <span className="text-sm uppercase tracking-wide font-semibold text-foreground/50 block mb-px">{label}</span>
                {meta[key] ? (
                  <span className="text-base text-foreground group-hover/field:text-foreground/90 transition-colors line-clamp-2">{meta[key]}</span>
                ) : (
                  <span className="text-base text-foreground/20 italic group-hover/field:text-foreground/35 transition-colors truncate block">{placeholder}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {dropboxUrl && (
        <div className="px-4 py-2.5 border-t border-card-border/40 flex justify-end">
          <a
            href={dropboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent/70 hover:text-accent transition-colors"
          >
            Open in Dropbox
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}
