"use client"

import { useState } from "react"

interface SkillFile {
  name: string
  path: string
  content: string
}

interface SkillRelationships {
  files: string[]
  tables: string[]
  invokes: string[]
  services: string[]
}

interface SkillInfo {
  files: SkillFile[]
  relationships: SkillRelationships
}

interface ContextNode {
  filePath: string
  shortPath: string
  summary: string
  content: string
  project: string
  depth: number
  children: ContextNode[]
  agents: string[]
  skills: string[]
  rules: string[]
  skillFiles: Record<string, SkillInfo>
}

interface ContextTreeNodeProps {
  node: ContextNode
  selectedPath: string | null
  onSelect: (node: ContextNode) => void
}

const LINE = "rgba(255,255,255,0.15)"

export default function ContextTreeNode({
  node,
  selectedPath,
  onSelect,
}: ContextTreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedPath === node.filePath
  const hasChildren = node.children.length > 0
  const agentCount = node.agents.length
  const skillCount = node.skills.length
  const ruleCount = node.rules.length

  const displayName = node.shortPath === "~/.claude/CLAUDE.md"
    ? "~/.claude/CLAUDE.md"
    : node.shortPath.replace(/\/CLAUDE\.md$/, "").split("/").pop() || node.shortPath

  return (
    <div className="flex flex-col items-center">
      {/* Node card */}
      <div
        onClick={() => onSelect(node)}
        className={`relative rounded-lg border px-4 py-2.5 min-w-[150px] max-w-[220px] text-center transition-all hover:bg-white/[0.06] cursor-pointer select-none ${
          isSelected
            ? "border-accent bg-accent/8 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
            : "border-white/[0.08] bg-white/[0.03]"
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          {hasChildren ? (
            <svg className="w-3.5 h-3.5 text-accent/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-muted/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          <span className="font-mono text-[11px] font-semibold text-foreground whitespace-nowrap">{displayName}</span>
        </div>
        {node.project === "global" && (
          <div className="text-[9px] text-accent-hover mt-0.5">global</div>
        )}
        {node.project !== "global" && node.depth === 0 && (
          <div className="text-[9px] text-muted mt-0.5">{node.project}</div>
        )}
        {node.summary && (
          <div className="text-[8px] text-muted/50 mt-0.5 line-clamp-1">{node.summary}</div>
        )}
        {(agentCount > 0 || skillCount > 0 || ruleCount > 0) && (
          <div className="flex gap-1 mt-1.5 justify-center flex-wrap">
            {agentCount > 0 && (
              <span className="text-[7px] bg-accent/10 text-accent-hover px-1 py-0.5 rounded">{agentCount}a</span>
            )}
            {skillCount > 0 && (
              <span className="text-[7px] bg-warning/10 text-warning px-1 py-0.5 rounded">{skillCount}s</span>
            )}
            {ruleCount > 0 && (
              <span className="text-[7px] bg-white/[0.06] text-muted px-1 py-0.5 rounded">{ruleCount}r</span>
            )}
          </div>
        )}

        {/* Expand/collapse toggle */}
        {hasChildren && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background border border-white/[0.15] flex items-center justify-center text-muted hover:text-foreground hover:border-accent/50 z-10 cursor-pointer"
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform ${expanded ? "" : "rotate-180"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <>
          {/* Vertical line from parent down to horizontal rail */}
          <div className="w-[1px] h-7" style={{ background: LINE }} />

          {node.children.length === 1 ? (
            <ContextTreeNode
              node={node.children[0]}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ) : (
            <div className="flex flex-col items-center">
              {/* Horizontal rail + vertical drops to children */}
              <div className="flex items-start">
                {node.children.map((child, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === node.children.length - 1
                  return (
                    <div key={child.filePath} className="flex flex-col items-center" style={{ minWidth: 0 }}>
                      {/* Top connector: horizontal rail piece + vertical drop */}
                      <div className="flex w-full">
                        {/* Left half of rail (hidden for first child) */}
                        <div
                          className="h-[1px] flex-1"
                          style={{ background: isFirst ? "transparent" : LINE }}
                        />
                        {/* Right half of rail (hidden for last child) */}
                        <div
                          className="h-[1px] flex-1"
                          style={{ background: isLast ? "transparent" : LINE }}
                        />
                      </div>
                      {/* Vertical drop from rail to child */}
                      <div className="w-[1px] h-5" style={{ background: LINE }} />
                      {/* The child node */}
                      <div className="px-3">
                        <ContextTreeNode
                          node={child}
                          selectedPath={selectedPath}
                          onSelect={onSelect}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export type { ContextNode }
