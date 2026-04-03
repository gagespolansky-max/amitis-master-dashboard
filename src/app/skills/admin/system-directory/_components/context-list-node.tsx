"use client"

import { useState } from "react"
import type { ContextNode } from "./context-tree-node"

interface ContextListNodeProps {
  node: ContextNode
  selectedPath: string | null
  onSelect: (node: ContextNode) => void
  isRoot?: boolean
}

const LINE = "rgba(255,255,255,0.1)"

export default function ContextListNode({
  node,
  selectedPath,
  onSelect,
  isRoot = false,
}: ContextListNodeProps) {
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
    <div className="mb-1">
      <div className="flex items-start gap-1.5">
        {hasChildren ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 w-4 h-4 flex items-center justify-center text-muted hover:text-foreground shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="mt-2 w-4 h-4 flex items-center justify-center shrink-0">
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </span>
        )}

        <button
          onClick={() => onSelect(node)}
          className={`flex-1 text-left rounded-md border px-3 py-2 transition-all hover:bg-white/[0.04] cursor-pointer ${
            isSelected
              ? "border-accent bg-accent/5 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]"
              : "border-white/[0.06] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <svg className="w-3.5 h-3.5 text-accent/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-muted/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            <span className="font-mono text-[11px] font-medium text-foreground">{displayName}</span>
            {node.project === "global" && (
              <span className="text-[9px] text-accent-hover bg-accent/10 px-1.5 py-0.5 rounded">global</span>
            )}
            {node.project !== "global" && isRoot && (
              <span className="text-[9px] text-muted bg-white/[0.06] px-1.5 py-0.5 rounded">{node.project}</span>
            )}
          </div>
          {node.summary && (
            <div className="text-[10px] text-muted/70 mt-0.5 pl-[22px] line-clamp-1">{node.summary}</div>
          )}
          {(agentCount > 0 || skillCount > 0 || ruleCount > 0) && (
            <div className="flex gap-1.5 mt-1 pl-[22px]">
              {agentCount > 0 && (
                <span className="text-[8px] bg-accent/10 text-accent-hover px-1 py-0.5 rounded">{agentCount} agents</span>
              )}
              {skillCount > 0 && (
                <span className="text-[8px] bg-warning/10 text-warning px-1 py-0.5 rounded">{skillCount} skills</span>
              )}
              {ruleCount > 0 && (
                <span className="text-[8px] bg-white/[0.06] text-muted px-1 py-0.5 rounded">{ruleCount} rules</span>
              )}
            </div>
          )}
        </button>
      </div>

      {hasChildren && expanded && (
        <div className="ml-[10px] relative">
          <div
            className="absolute w-[1px]"
            style={{ left: 0, top: 0, bottom: 20, background: LINE }}
          />
          {node.children.map((child) => (
            <div key={child.filePath} className="relative ml-5">
              <div
                className="absolute h-[1px]"
                style={{ left: -20, width: 20, top: 20, background: LINE }}
              />
              <ContextListNode
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
