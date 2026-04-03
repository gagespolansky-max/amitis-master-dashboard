export interface LearningLogEntry {
  id: string
  concept: string
  explanation: string
  context: string | null
  category: string
  created_at: string
}

export const CATEGORIES = [
  "databases",
  "api",
  "infrastructure",
  "frontend",
  "ai",
  "devops",
  "general",
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_COLORS: Record<string, string> = {
  databases: "bg-blue-500/20 text-blue-400",
  api: "bg-green-500/20 text-green-400",
  infrastructure: "bg-orange-500/20 text-orange-400",
  frontend: "bg-purple-500/20 text-purple-400",
  ai: "bg-pink-500/20 text-pink-400",
  devops: "bg-yellow-500/20 text-yellow-400",
  general: "bg-zinc-500/20 text-zinc-400",
}
