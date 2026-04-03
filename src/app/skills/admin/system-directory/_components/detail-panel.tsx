"use client"

import type { DirectoryEntry } from "./directory-entry-card"
import DetailAccordion from "./detail-accordion"
import AskSection from "./ask-section"
import UsageSection from "./usage-section"
import ContentPreview from "./content-preview"

interface DetailPanelProps {
  entry: DirectoryEntry | null
  allEntries: DirectoryEntry[]
  onSelectEntry: (name: string) => void
}

function ReferencePill({
  name,
  variant,
  onClick,
}: {
  name: string
  variant: "agent" | "skill" | "neutral"
  onClick: () => void
}) {
  const colors = {
    agent: "bg-accent/10 border-accent/30 text-accent-hover",
    skill: "bg-warning/10 border-warning/30 text-warning",
    neutral: "bg-white/5 border-card-border text-foreground",
  }
  return (
    <button
      onClick={onClick}
      className={`text-xs border px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${colors[variant]}`}
    >
      /{name}
    </button>
  )
}

export default function DetailPanel({
  entry,
  allEntries,
  onSelectEntry,
}: DetailPanelProps) {
  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Select an agent or skill to view details
      </div>
    )
  }

  const entryMap = new Map(allEntries.map((e) => [e.name, e]))

  const usesAgents = entry.uses.filter((name) => {
    const target = entryMap.get(name)
    return target?.layer === "agent"
  })
  const usesSkills = entry.uses.filter((name) => {
    const target = entryMap.get(name)
    return target?.layer === "skill"
  })
  const usesUnknown = entry.uses.filter((name) => !entryMap.has(name))

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-5">
        <span className="font-bold text-lg">{entry.slashCommand}</span>
        <span
          className={`text-[10px] font-semibold px-2.5 py-1 rounded ${
            entry.layer === "agent"
              ? "bg-accent text-white"
              : "bg-warning/80 text-black"
          }`}
        >
          {entry.layer.toUpperCase()}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
          Scope
        </div>
        <div className="text-sm">{entry.scope}</div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
          Description
        </div>
        <div className="text-sm">{entry.description}</div>
      </div>

      {entry.owns.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
            Owns
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.owns.map((item) => (
              <code
                key={item}
                className="text-xs bg-background px-1.5 py-0.5 rounded border border-card-border"
              >
                {item}
              </code>
            ))}
          </div>
        </div>
      )}

      {usesAgents.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            {entry.layer === "agent" ? "Delegates to" : "Uses agents"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {usesAgents.map((name) => (
              <ReferencePill
                key={name}
                name={name}
                variant="agent"
                onClick={() => onSelectEntry(name)}
              />
            ))}
          </div>
        </div>
      )}

      {usesSkills.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Uses skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {usesSkills.map((name) => (
              <ReferencePill
                key={name}
                name={name}
                variant="skill"
                onClick={() => onSelectEntry(name)}
              />
            ))}
          </div>
        </div>
      )}

      {usesUnknown.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            References (external)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {usesUnknown.map((name) => (
              <ReferencePill
                key={name}
                name={name}
                variant="neutral"
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {entry.usedBy.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Used by
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.usedBy.map((name) => {
              const target = entryMap.get(name)
              return (
                <ReferencePill
                  key={name}
                  name={name}
                  variant={target?.layer === "agent" ? "agent" : "skill"}
                  onClick={() => onSelectEntry(name)}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
          Hub status
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded border ${
            entry.hubStatus === "in_catalog"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-white/5 border-card-border text-muted"
          }`}
        >
          {entry.hubStatus === "in_catalog" ? "in catalog" : "local only"}
        </span>
      </div>

      <div className="pt-4 mt-4 border-t border-card-border">
        <div className="text-[10px] text-muted font-mono break-all">
          {entry.filePath}
        </div>
      </div>

      {/* Accordion sections */}
      <div className="mt-4">
        <DetailAccordion title="Ask">
          <AskSection entry={entry} allEntries={allEntries} />
        </DetailAccordion>

        <DetailAccordion title="Usage">
          <UsageSection entryName={entry.name} />
        </DetailAccordion>

        <DetailAccordion title="Content">
          <ContentPreview filePath={entry.filePath} />
        </DetailAccordion>
      </div>
    </div>
  )
}
