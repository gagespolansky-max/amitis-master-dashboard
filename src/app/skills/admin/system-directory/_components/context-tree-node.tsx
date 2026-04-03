"use client"

interface ContextNode {
  filePath: string
  shortPath: string
  summary: string
  project: string
  depth: number
  children: ContextNode[]
  agents: string[]
  skills: string[]
  rules: string[]
}

interface ContextTreeNodeProps {
  node: ContextNode
  selectedPath: string | null
  onSelect: (node: ContextNode) => void
}

export default function ContextTreeNode({
  node,
  selectedPath,
  onSelect,
}: ContextTreeNodeProps) {
  const isSelected = selectedPath === node.filePath
  const childCount = node.children.length
  const agentCount = node.agents.length
  const skillCount = node.skills.length
  const ruleCount = node.rules.length

  return (
    <div className="ml-4">
      <button
        onClick={() => onSelect(node)}
        className={`w-full text-left rounded-lg border p-3 mb-2 transition-colors hover:bg-white/5 cursor-pointer ${
          isSelected ? "border-accent bg-accent/5" : "border-card-border"
        }`}
      >
        <div className="font-mono text-xs font-medium text-foreground mb-1">
          {node.shortPath}
        </div>
        <div className="text-[11px] text-muted line-clamp-2">{node.summary}</div>
        <div className="flex gap-2 mt-2">
          {childCount > 0 && (
            <span className="text-[9px] bg-accent/10 text-accent-hover px-1.5 py-0.5 rounded">
              {childCount} children
            </span>
          )}
          {agentCount > 0 && (
            <span className="text-[9px] bg-accent/10 text-accent-hover px-1.5 py-0.5 rounded">
              {agentCount} agents
            </span>
          )}
          {skillCount > 0 && (
            <span className="text-[9px] bg-warning/10 text-warning px-1.5 py-0.5 rounded">
              {skillCount} skills
            </span>
          )}
          {ruleCount > 0 && (
            <span className="text-[9px] bg-white/5 text-muted px-1.5 py-0.5 rounded">
              {ruleCount} rules
            </span>
          )}
        </div>
      </button>

      {node.children.length > 0 && (
        <div className="border-l border-card-border ml-3 pl-2">
          {node.children.map((child) => (
            <ContextTreeNode
              key={child.filePath}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export type { ContextNode }
