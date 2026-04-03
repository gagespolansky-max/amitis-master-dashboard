"use client"

interface DirectoryEntry {
  name: string
  slashCommand: string
  layer: "agent" | "skill"
  scope: "global" | string
  description: string
  owns: string[]
  uses: string[]
  usedBy: string[]
  filePath: string
  hubStatus: "in_catalog" | "local_only"
}

interface DirectoryEntryCardProps {
  entry: DirectoryEntry
  isSelected: boolean
  isReferenced: boolean
  onClick: () => void
}

function scopeLabel(scope: string): string {
  if (scope === "global") return "global"
  return scope.replace("project:", "")
}

function scopeColor(scope: string): string {
  if (scope === "global") return "bg-success/20 text-success"
  if (scope.includes("master-dashboard")) return "bg-accent/20 text-accent-hover"
  return "bg-blue-500/20 text-blue-400"
}

export default function DirectoryEntryCard({
  entry,
  isSelected,
  isReferenced,
  onClick,
}: DirectoryEntryCardProps) {
  let borderClass = "border-card-border"
  if (isSelected) borderClass = "border-accent bg-accent/5"
  else if (isReferenced) borderClass = "border-warning bg-warning/5"

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-white/5 cursor-pointer ${borderClass}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-sm text-foreground">
          {entry.slashCommand}
        </span>
        {isReferenced && !isSelected && (
          <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded">
            referenced
          </span>
        )}
      </div>
      <span
        className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${scopeColor(entry.scope)}`}
      >
        {scopeLabel(entry.scope)}
      </span>
      <p className="text-xs text-muted mt-1.5 line-clamp-2">{entry.description}</p>
    </button>
  )
}

export type { DirectoryEntry }
