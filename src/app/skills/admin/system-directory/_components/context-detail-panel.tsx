"use client"

import { useState } from "react"
import type { ContextNode } from "./context-tree-node"

interface ContextDetailPanelProps {
  node: ContextNode | null
  onSwitchToDirectory?: (entryName: string) => void
}

export default function ContextDetailPanel({
  node,
  onSwitchToDirectory,
}: ContextDetailPanelProps) {
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({})
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Select a CLAUDE.md file to view its contents
      </div>
    )
  }

  const toggleSkill = (name: string) => {
    setExpandedSkills((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const skillInfoEntries = Object.entries(node.skillFiles || {})

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="font-mono text-sm font-semibold mb-1">{node.shortPath}</div>
      <div className="text-[10px] text-muted mb-4 font-mono break-all">{node.filePath}</div>

      {node.children.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Child CLAUDE.md files
          </div>
          <div className="space-y-1">
            {node.children.map((child) => (
              <div key={child.filePath} className="text-xs text-accent-hover font-mono">
                {child.shortPath}
              </div>
            ))}
          </div>
        </div>
      )}

      {node.agents.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Agents
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.agents.map((name) => (
              <button
                key={name}
                onClick={() => onSwitchToDirectory?.(name)}
                className="text-xs bg-accent/10 border border-accent/30 text-accent-hover px-2 py-1 rounded cursor-pointer hover:opacity-80"
              >
                /{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {node.skills.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.skills.map((name) => (
              <button
                key={name}
                onClick={() => onSwitchToDirectory?.(name)}
                className="text-xs bg-warning/10 border border-warning/30 text-warning px-2 py-1 rounded cursor-pointer hover:opacity-80"
              >
                /{name}
              </button>
            ))}
          </div>
        </div>
      )}

      {node.rules.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Rules
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.rules.map((name) => (
              <code key={name} className="text-xs bg-background px-1.5 py-0.5 rounded border border-card-border">
                {name}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Skill Details */}
      {skillInfoEntries.length > 0 && (
        <div className="mb-4 pt-4 border-t border-card-border">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-2">
            Skill Details
          </div>
          <div className="space-y-3">
            {skillInfoEntries.map(([skillName, info]) => {
              const rel = info.relationships
              const hasRelationships = rel.files.length > 0 || rel.tables.length > 0 || rel.invokes.length > 0 || rel.services.length > 0
              return (
                <div key={skillName} className="border border-card-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSkill(skillName)}
                    className="flex items-center gap-1.5 w-full text-left text-xs font-mono px-3 py-2 hover:bg-white/[0.03] transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 text-muted transition-transform shrink-0 ${expandedSkills[skillName] ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-warning/80 font-medium">{skillName}</span>
                    <span className="text-muted text-[10px]">{info.files.length} files</span>
                  </button>
                  {expandedSkills[skillName] && (
                    <div className="px-3 pb-3 space-y-3">
                      {/* Relationships */}
                      {hasRelationships && (
                        <div className="space-y-2">
                          {rel.files.length > 0 && (
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted/60 mb-1">Touches files</div>
                              <div className="flex flex-wrap gap-1">
                                {rel.files.map((f) => (
                                  <code key={f} className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                    {f}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                          {rel.tables.length > 0 && (
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted/60 mb-1">Tables</div>
                              <div className="flex flex-wrap gap-1">
                                {rel.tables.map((t) => (
                                  <code key={t} className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                                    {t}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                          {rel.invokes.length > 0 && (
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted/60 mb-1">Invokes</div>
                              <div className="flex flex-wrap gap-1">
                                {rel.invokes.map((s) => (
                                  <code key={s} className="text-[10px] bg-accent/10 text-accent-hover px-1.5 py-0.5 rounded border border-accent/20">
                                    /{s}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                          {rel.services.length > 0 && (
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-muted/60 mb-1">Services</div>
                              <div className="flex flex-wrap gap-1">
                                {rel.services.map((s) => (
                                  <code key={s} className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                                    {s}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Files */}
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted/60 mb-1">Skill files</div>
                        <div className="space-y-0.5">
                          {info.files.map((file) => (
                            <div key={file.path}>
                              <button
                                onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}
                                className={`text-[11px] font-mono py-0.5 px-1.5 rounded w-full text-left transition-colors ${
                                  expandedFile === file.path
                                    ? "bg-accent/10 text-accent-hover"
                                    : "text-foreground/70 hover:text-foreground hover:bg-white/[0.03]"
                                }`}
                              >
                                {file.name}
                              </button>
                              {expandedFile === file.path && (
                                <pre className="text-[10px] font-mono text-foreground/70 bg-background border border-card-border rounded-md p-2 mt-1 mb-2 ml-1 overflow-auto max-h-[300px] whitespace-pre-wrap break-words">
                                  {file.content || "(empty)"}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-card-border">
        <div className="text-[10px] uppercase tracking-wider text-muted mb-2">Content</div>
        <pre className="text-xs font-mono text-foreground/80 bg-background border border-card-border rounded-lg p-3 overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
          {node.content || "(empty)"}
        </pre>
      </div>
    </div>
  )
}
