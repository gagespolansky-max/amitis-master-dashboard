"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Trash2, Image as ImageIcon, CheckCircle2, Check, X, ChevronsUp } from "lucide-react"
import {
  LearningLogEntry,
  getCategoryColor,
  SOURCE_COLORS,
  SOURCE_LABELS,
} from "../_lib/learning-log-types"
import MarkdownRenderer from "./markdown-renderer"
import type { SuggestedUpdates } from "./refinement-chat"

interface EntryCardProps {
  entry: LearningLogEntry
  isExpanded: boolean
  isConfirmingDelete: boolean
  proposals: SuggestedUpdates | null
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onAcceptProposal: (field: keyof SuggestedUpdates) => void
  onRejectProposal: (field: keyof SuggestedUpdates) => void
}

function ProposalBlock({
  label,
  children,
  onAccept,
  onReject,
}: {
  label: string
  children: React.ReactNode
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className="rounded-lg border-2 border-accent/40 bg-accent/5 px-4 py-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
          Proposed {label}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onAccept() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-medium"
          >
            <Check size={12} /> Accept
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject() }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[10px] font-medium"
          >
            <X size={12} /> Reject
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

// Threshold: entries with content longer than this get a separate abridged view
const LONG_CONTENT_THRESHOLD = 500
// How much content to show in abridged view (chars)
const ABRIDGED_LIMIT = 1000

/** Truncate markdown at a paragraph/heading boundary near the limit */
function truncateMarkdown(md: string, limit: number): string {
  if (md.length <= limit) return md
  // Find the last double-newline (paragraph break) before the limit
  const slice = md.slice(0, limit)
  const lastBreak = slice.lastIndexOf("\n\n")
  if (lastBreak > limit * 0.4) return slice.slice(0, lastBreak)
  // Fall back to last single newline
  const lastNewline = slice.lastIndexOf("\n")
  if (lastNewline > limit * 0.4) return slice.slice(0, lastNewline)
  return slice
}

export default function EntryCard({
  entry,
  isExpanded,
  isConfirmingDelete,
  proposals,
  onToggleExpand,
  onEdit,
  onDelete,
  onConfirmDelete,
  onAcceptProposal,
  onRejectProposal,
}: EntryCardProps) {
  const [showFull, setShowFull] = useState(false)

  const preview = entry.explanation.length > 80
    ? entry.explanation.slice(0, 80) + "…"
    : entry.explanation

  const hasImages = entry.image_urls && entry.image_urls.length > 0
  const hasProposals = proposals && Object.keys(proposals).some(
    (k) => proposals[k as keyof SuggestedUpdates] !== undefined
  )

  // Is this entry long enough to warrant the abridged middle tier?
  const isLongEntry = entry.content != null && entry.content.length > LONG_CONTENT_THRESHOLD

  // When isExpanded but not showFull on a long entry → abridged
  // When isExpanded and (showFull or short entry) → full
  const isAbridged = isExpanded && isLongEntry && !showFull
  const isFull = isExpanded && (!isLongEntry || showFull)

  // Reset showFull when the card collapses
  function handleToggle() {
    if (isExpanded) {
      setShowFull(false)
    }
    onToggleExpand()
  }

  return (
    <div className={`bg-card-bg border rounded-lg px-4 py-3 transition-all ${
      hasProposals ? "border-accent/40" : "border-card-border"
    }`}>
      {/* Header — always visible */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <span className="font-medium text-sm">{entry.concept}</span>
        {entry.is_verified && (
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
        )}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryColor(entry.category)}`}
        >
          {entry.category}
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            SOURCE_COLORS[entry.source] || SOURCE_COLORS.dashboard
          }`}
        >
          {SOURCE_LABELS[entry.source] || entry.source}
        </span>
        <span className="text-[10px] text-muted">
          {new Date(entry.created_at).toLocaleDateString()}
        </span>
        {hasImages && (
          <span className="flex items-center gap-0.5 text-amber-400">
            <ImageIcon size={12} />
            {entry.image_urls.length > 1 && (
              <span className="text-[10px]">{entry.image_urls.length}</span>
            )}
          </span>
        )}
        {hasProposals && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
            Changes proposed
          </span>
        )}
        <div className="flex-1" />
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted" />
        ) : (
          <ChevronDown size={14} className="text-muted" />
        )}
      </div>

      {/* Collapsed preview */}
      {!isExpanded && (
        <p className="text-xs text-foreground/60 mt-1 truncate">{preview}</p>
      )}

      {/* Abridged view — truncated formatted content + metadata */}
      {isAbridged && (
        <div className="mt-3 space-y-3">
          {/* Proposals (always show in abridged so user can act on them) */}
          {proposals?.concept !== undefined && (
            <ProposalBlock
              label="concept name"
              onAccept={() => onAcceptProposal("concept")}
              onReject={() => onRejectProposal("concept")}
            >
              <p className="text-sm font-medium text-foreground">{proposals.concept}</p>
            </ProposalBlock>
          )}
          {proposals?.explanation !== undefined && (
            <ProposalBlock
              label="summary"
              onAccept={() => onAcceptProposal("explanation")}
              onReject={() => onRejectProposal("explanation")}
            >
              <p className="text-sm text-foreground/80">{proposals.explanation}</p>
            </ProposalBlock>
          )}
          {proposals?.category !== undefined && (
            <ProposalBlock
              label="category"
              onAccept={() => onAcceptProposal("category")}
              onReject={() => onRejectProposal("category")}
            >
              <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(proposals.category)}`}>
                {proposals.category}
              </span>
            </ProposalBlock>
          )}
          {proposals?.tags !== undefined && (
            <ProposalBlock
              label="tags"
              onAccept={() => onAcceptProposal("tags")}
              onReject={() => onRejectProposal("tags")}
            >
              <div className="flex gap-1.5 flex-wrap">
                {proposals.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                    {tag}
                  </span>
                ))}
              </div>
            </ProposalBlock>
          )}

          {/* Truncated formatted content with gradient fade */}
          <div className="relative">
            <MarkdownRenderer content={truncateMarkdown(entry.content!, ABRIDGED_LIMIT)} />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card-bg to-transparent pointer-events-none" />
          </div>

          {/* Image thumbnails (smaller in abridged) */}
          {hasImages && (
            <div className="flex gap-1.5 flex-wrap">
              {entry.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="w-16 h-16 rounded-md border border-card-border hover:opacity-80 transition-opacity object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-card-border text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Read full article link */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowFull(true) }}
            className="text-xs text-accent hover:text-accent-hover font-medium"
          >
            Read full article →
          </button>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 border-t border-card-border">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="text-xs text-muted hover:text-foreground flex items-center gap-1"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isConfirmingDelete) onDelete()
                else onConfirmDelete()
              }}
              className={`text-xs flex items-center gap-1 ${
                isConfirmingDelete ? "text-red-400" : "text-muted hover:text-red-400"
              }`}
            >
              <Trash2 size={12} />
              {isConfirmingDelete ? "Confirm delete" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Full expanded content */}
      {isFull && (
        <div className="mt-3 space-y-3">
          {/* Proposed concept */}
          {proposals?.concept !== undefined && (
            <ProposalBlock
              label="concept name"
              onAccept={() => onAcceptProposal("concept")}
              onReject={() => onRejectProposal("concept")}
            >
              <p className="text-sm font-medium text-foreground">{proposals.concept}</p>
            </ProposalBlock>
          )}

          {/* Proposed summary */}
          {proposals?.explanation !== undefined && (
            <ProposalBlock
              label="summary"
              onAccept={() => onAcceptProposal("explanation")}
              onReject={() => onRejectProposal("explanation")}
            >
              <p className="text-sm text-foreground/80">{proposals.explanation}</p>
            </ProposalBlock>
          )}

          {/* Current content */}
          {entry.content ? (
            <MarkdownRenderer content={entry.content} />
          ) : (
            <p className="text-sm text-foreground/80">{entry.explanation}</p>
          )}

          {/* Proposed content — full revised article */}
          {proposals?.content !== undefined && (
            <ProposalBlock
              label="revised article"
              onAccept={() => onAcceptProposal("content")}
              onReject={() => onRejectProposal("content")}
            >
              <MarkdownRenderer content={proposals.content} />
            </ProposalBlock>
          )}

          {/* Proposed category */}
          {proposals?.category !== undefined && (
            <ProposalBlock
              label="category"
              onAccept={() => onAcceptProposal("category")}
              onReject={() => onRejectProposal("category")}
            >
              <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(proposals.category)}`}>
                {proposals.category}
              </span>
            </ProposalBlock>
          )}

          {/* Proposed tags */}
          {proposals?.tags !== undefined && (
            <ProposalBlock
              label="tags"
              onAccept={() => onAcceptProposal("tags")}
              onReject={() => onRejectProposal("tags")}
            >
              <div className="flex gap-1.5 flex-wrap">
                {proposals.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                    {tag}
                  </span>
                ))}
              </div>
            </ProposalBlock>
          )}

          {/* Image gallery */}
          {hasImages && (
            <div className="flex gap-2 flex-wrap">
              {entry.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="max-w-xs max-h-48 rounded-md border border-card-border hover:opacity-80 transition-opacity object-contain"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Context */}
          {entry.context && (
            <p className="text-xs text-muted">Context: {entry.context}</p>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-card-border text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 border-t border-card-border">
            {/* Show less button for long entries */}
            {isLongEntry && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowFull(false) }}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 font-medium"
              >
                <ChevronsUp size={12} /> Show less
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="text-xs text-muted hover:text-foreground flex items-center gap-1"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isConfirmingDelete) onDelete()
                else onConfirmDelete()
              }}
              className={`text-xs flex items-center gap-1 ${
                isConfirmingDelete ? "text-red-400" : "text-muted hover:text-red-400"
              }`}
            >
              <Trash2 size={12} />
              {isConfirmingDelete ? "Confirm delete" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
