"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { LearningLogEntry, getCategoryColor } from "../_lib/learning-log-types"
import EntryCard from "./entry-card"
import type { SuggestedUpdates } from "./refinement-chat"

interface CategorySectionProps {
  category: string
  entries: LearningLogEntry[]
  isCollapsed: boolean
  expandedEntryId: string | null
  confirmDeleteId: string | null
  proposalsMap: Record<string, SuggestedUpdates>
  onToggleCollapse: () => void
  onToggleEntry: (id: string) => void
  onEditEntry: (entry: LearningLogEntry) => void
  onDeleteEntry: (id: string) => void
  onConfirmDelete: (id: string) => void
  onAcceptProposal: (entryId: string, field: keyof SuggestedUpdates) => void
  onRejectProposal: (entryId: string, field: keyof SuggestedUpdates) => void
}

export default function CategorySection({
  category,
  entries,
  isCollapsed,
  expandedEntryId,
  confirmDeleteId,
  proposalsMap,
  onToggleCollapse,
  onToggleEntry,
  onEditEntry,
  onDeleteEntry,
  onConfirmDelete,
  onAcceptProposal,
  onRejectProposal,
}: CategorySectionProps) {
  return (
    <div>
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 mb-2 group"
      >
        {isCollapsed ? (
          <ChevronRight size={14} className="text-muted" />
        ) : (
          <ChevronDown size={14} className="text-muted" />
        )}
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${getCategoryColor(category)}`}
        >
          {category}
        </span>
        <span className="text-xs text-muted">{entries.length}</span>
      </button>

      {!isCollapsed && (
        <div className="space-y-2 ml-5">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntryId === entry.id}
              isConfirmingDelete={confirmDeleteId === entry.id}
              proposals={proposalsMap[entry.id] || null}
              onToggleExpand={() => onToggleEntry(entry.id)}
              onEdit={() => onEditEntry(entry)}
              onDelete={() => onDeleteEntry(entry.id)}
              onConfirmDelete={() => onConfirmDelete(entry.id)}
              onAcceptProposal={(field) => onAcceptProposal(entry.id, field)}
              onRejectProposal={(field) => onRejectProposal(entry.id, field)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
