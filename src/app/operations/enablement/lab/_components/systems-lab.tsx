'use client'

import { useState } from 'react'
import { systemBlueprints, claudeCodeToolkit, type SystemBlueprint } from '../_lib/systems-lab-data'
import AgenticArchitectures from './agentic-architectures'

const difficultyStyles = {
  starter: 'bg-success/10 text-success',
  intermediate: 'bg-warning/10 text-warning',
  advanced: 'bg-red-400/10 text-red-400',
}

const functionColors: Record<string, string> = {
  Portfolio: 'bg-blue-500/10 text-blue-400',
  Research: 'bg-purple-500/10 text-purple-400',
  'Investor Relations': 'bg-accent/10 text-accent',
  Operations: 'bg-success/10 text-success',
  'AI Initiatives': 'bg-warning/10 text-warning',
}

function ToolkitReference() {
  const [showTools, setShowTools] = useState(false)

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
      <button
        onClick={() => setShowTools(!showTools)}
        className="w-full flex items-center justify-between"
      >
        <div>
          <h3 className="text-sm font-medium text-left">Claude Code Toolkit Reference</h3>
          <p className="text-xs text-muted text-left mt-0.5">
            Commands, tools, and patterns available for building systems
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${showTools ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showTools && (
        <div className="mt-4 space-y-6">
          <div>
            <h4 className="text-xs font-medium text-accent mb-3">Commands & Tools</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {claudeCodeToolkit.commands.map((cmd) => (
                <div key={cmd.name} className="p-3 rounded-lg border border-card-border bg-background">
                  <code className="text-xs font-mono text-accent">{cmd.name}</code>
                  <p className="text-xs text-muted mt-1">{cmd.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-warning mb-3">Orchestration Patterns</h4>
            <div className="space-y-2">
              {claudeCodeToolkit.patterns.map((p) => (
                <div key={p.name} className="p-3 rounded-lg border border-card-border bg-background">
                  <span className="text-xs font-medium">{p.name}</span>
                  <p className="text-xs text-muted mt-0.5">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BlueprintDetail({ blueprint, onBack }: { blueprint: SystemBlueprint; onBack: () => void }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  return (
    <div>
      <button
        onClick={onBack}
        className="text-xs text-muted hover:text-foreground transition-colors mb-4"
      >
        &larr; Back to blueprints
      </button>

      <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficultyStyles[blueprint.difficulty]}`}>
            {blueprint.difficulty}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${functionColors[blueprint.businessFunction] || 'bg-muted/10 text-muted'}`}>
            {blueprint.businessFunction}
          </span>
        </div>
        <h2 className="text-lg font-medium mb-2">{blueprint.title}</h2>
        <p className="text-sm text-muted">{blueprint.description}</p>

        <div className="mt-4 p-4 rounded-lg bg-red-400/5 border border-red-400/10">
          <p className="text-xs font-medium text-red-400 mb-1">The problem</p>
          <p className="text-sm text-muted">{blueprint.problem}</p>
        </div>
      </div>

      {/* Agent Org Chart */}
      <div className="rounded-xl border border-card-border bg-card-bg p-6 mb-6">
        <h3 className="text-sm font-medium mb-4">Agent Org Chart</h3>

        <div className="space-y-3">
          {blueprint.agents.map((agent, i) => (
            <div key={agent.id} className="p-4 rounded-lg border border-card-border bg-background">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted">#{i + 1}</span>
                    <h4 className="text-sm font-medium">{agent.title}</h4>
                  </div>
                  <p className="text-xs text-muted mt-1">{agent.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {agent.tools.map((tool) => (
                  <span key={tool} className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent">
                    {tool}
                  </span>
                ))}
                {agent.mcpServers?.map((mcp) => (
                  <span key={mcp} className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    MCP: {mcp}
                  </span>
                ))}
                {agent.skills?.map((skill) => (
                  <span key={skill} className="text-[10px] font-mono px-2 py-0.5 rounded bg-success/10 text-success">
                    {skill}
                  </span>
                ))}
                {agent.triggers?.map((trigger) => (
                  <span key={trigger} className="text-[10px] font-mono px-2 py-0.5 rounded bg-warning/10 text-warning">
                    {trigger}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded-lg bg-accent/5 border border-accent/10">
          <p className="text-xs font-medium text-accent mb-1">Orchestration pattern</p>
          <p className="text-sm text-muted">{blueprint.orchestration}</p>
        </div>

        <div className="mt-3">
          <p className="text-xs font-medium text-muted mb-2">Claude Code tools used</p>
          <div className="flex flex-wrap gap-1.5">
            {blueprint.claudeCodeCommands.map((cmd) => (
              <span key={cmd} className="text-[10px] font-mono px-2 py-0.5 rounded bg-card-border text-foreground">
                {cmd}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Build Walkthrough */}
      <div className="rounded-xl border border-card-border bg-card-bg p-6">
        <h3 className="text-sm font-medium mb-4">Step-by-Step Build Guide</h3>
        <p className="text-xs text-muted mb-4">
          Follow these steps to build this system. Click a step to expand it, then ask Claude Code to help you implement it.
        </p>

        <div className="space-y-2">
          {blueprint.walkthrough.map((step, i) => (
            <button
              key={i}
              onClick={() => setExpandedStep(expandedStep === i ? null : i)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                expandedStep === i
                  ? 'border-accent/30 bg-accent/5'
                  : 'border-card-border bg-background hover:border-card-border/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`text-xs font-mono mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  expandedStep === i ? 'bg-accent text-white' : 'bg-card-border text-muted'
                }`}>
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm">{step}</p>
                  {expandedStep === i && (
                    <p className="text-xs text-accent mt-2">
                      Copy this step and paste it into Claude Code to get started building it.
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SystemsLab() {
  const [selectedBlueprint, setSelectedBlueprint] = useState<SystemBlueprint | null>(null)

  if (selectedBlueprint) {
    return <BlueprintDetail blueprint={selectedBlueprint} onBack={() => setSelectedBlueprint(null)} />
  }

  return (
    <div>
      <ToolkitReference />

      <div className="mb-8">
        <h3 className="text-sm font-medium mb-3">Agentic Architectures</h3>
        <p className="text-xs text-muted mb-4">
          Interactive diagrams showing how AI agents connect to each other, tools like Pinecone, and data sources via MCP. Hover to explore.
        </p>
        <AgenticArchitectures />
      </div>

      <h3 className="text-sm font-medium mb-3">System Blueprints</h3>
      <p className="text-xs text-muted mb-4">
        Pick a use case. Each blueprint shows you the agent org chart, orchestration pattern, Claude Code tools needed, and a step-by-step guide to build it.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systemBlueprints.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setSelectedBlueprint(bp)}
            className="group rounded-xl border border-card-border bg-card-bg p-5 text-left transition-all hover:border-accent/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${difficultyStyles[bp.difficulty]}`}>
                {bp.difficulty}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${functionColors[bp.businessFunction] || 'bg-muted/10 text-muted'}`}>
                {bp.businessFunction}
              </span>
            </div>
            <h4 className="text-sm font-medium group-hover:text-accent transition-colors mb-1">
              {bp.title}
            </h4>
            <p className="text-xs text-muted mb-3">{bp.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">{bp.agents.length} agents</span>
              <span className="text-[10px] text-muted">&middot;</span>
              <span className="text-[10px] text-muted">{bp.walkthrough.length} steps</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
