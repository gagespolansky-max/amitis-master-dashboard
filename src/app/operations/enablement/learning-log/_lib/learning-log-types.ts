export interface LearningLogEntry {
  id: string
  concept: string
  explanation: string
  content: string | null
  context: string | null
  category: string
  source: 'claude_code' | 'dashboard' | 'screenshot'
  image_urls: string[]
  tags: string[]
  is_verified: boolean
  chat_history: Array<{role: 'user' | 'assistant', content: string}> | null
  updated_at: string | null
  created_at: string
}

// Default categories — matches SKILL.md. Custom ones from entries are merged at runtime.
export const DEFAULT_CATEGORIES = [
  // Core engineering
  "databases",
  "api",
  "infrastructure",
  "frontend",
  "python",
  "typescript",
  "devops",
  "testing",
  "security",
  "performance",
  // Architecture & design
  "architecture",
  "data-modeling",
  "design-patterns",
  "workflow",
  "data-pipelines",
  "validation",
  "integration",
  // AI & agents
  "ai-agents",
  "ai",
  "code-generation",
  // Meta
  "documentation",
  "general",
] as const

// Keep CATEGORIES as alias for backward compat
export const CATEGORIES = DEFAULT_CATEGORIES

export type Category = string

export const CATEGORY_COLORS: Record<string, string> = {
  // Core engineering
  databases: "bg-blue-500/20 text-blue-400",
  api: "bg-green-500/20 text-green-400",
  infrastructure: "bg-orange-500/20 text-orange-400",
  frontend: "bg-purple-500/20 text-purple-400",
  python: "bg-sky-500/20 text-sky-400",
  typescript: "bg-blue-600/20 text-blue-300",
  devops: "bg-yellow-500/20 text-yellow-400",
  testing: "bg-teal-500/20 text-teal-400",
  security: "bg-red-500/20 text-red-400",
  performance: "bg-lime-500/20 text-lime-400",
  // Architecture & design
  architecture: "bg-cyan-500/20 text-cyan-400",
  "data-modeling": "bg-violet-500/20 text-violet-400",
  "design-patterns": "bg-fuchsia-500/20 text-fuchsia-400",
  workflow: "bg-amber-500/20 text-amber-400",
  "data-pipelines": "bg-amber-600/20 text-amber-400",
  validation: "bg-emerald-500/20 text-emerald-400",
  integration: "bg-rose-500/20 text-rose-400",
  // AI & agents
  "ai-agents": "bg-pink-500/20 text-pink-400",
  ai: "bg-pink-600/20 text-pink-300",
  "code-generation": "bg-indigo-500/20 text-indigo-400",
  // Meta
  documentation: "bg-stone-500/20 text-stone-400",
  general: "bg-zinc-500/20 text-zinc-400",
}

// Fallback color for custom categories not in the map
export const DEFAULT_CATEGORY_COLOR = "bg-zinc-500/20 text-zinc-400"

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR
}

export const SOURCE_COLORS: Record<string, string> = {
  claude_code: "bg-emerald-500/20 text-emerald-400",
  dashboard: "bg-indigo-500/20 text-indigo-400",
  screenshot: "bg-amber-500/20 text-amber-400",
}

export const SOURCE_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  dashboard: "Dashboard",
  screenshot: "Screenshot",
}
