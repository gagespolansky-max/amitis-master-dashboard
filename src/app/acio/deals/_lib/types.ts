export type DealStage = "sourced" | "initial_call" | "dd_in_progress" | "ic_review" | "committed" | "passed"

export type DealStatus = "pending_review" | "confirmed" | "dismissed"

export type DealSource = "baseline_scan" | "label"

export type DealPriority = "high" | "medium" | "low"

export type InvestmentType = "SPV" | "Fund" | "Direct" | "Co-Invest" | "Other"

export interface Deal {
  id: string
  company_name: string
  deal_type: string | null
  stage: DealStage
  status: DealStatus
  source: DealSource
  source_thread_id: string | null
  source_subject: string | null
  key_contacts: { name: string; email: string; role: string }[] | null
  notes: string | null
  memo_url: string | null
  memo_filename: string | null
  priority: DealPriority
  industry: string | null
  investment_type: InvestmentType | null
  company_description: string | null
  value_proposition: string | null
  reminder_date: string | null
  reminder_note: string | null
  first_contacted_at: string | null
  last_contacted_at: string | null
  first_seen_at: string
  stage_updated_at: string
  created_at: string
  updated_at: string
}

export interface EmailMessage {
  id: string
  deal_email_id: string
  message_id: string
  from_name: string | null
  from_email: string | null
  date: string | null
  subject: string | null
  body_text: string | null
  snippet: string | null
  created_at: string
}

export interface DealEmail {
  id: string
  deal_id: string
  thread_id: string
  subject: string | null
  last_message_date: string | null
  snippet: string | null
  participants: { name: string; email: string }[] | null
  created_at: string
}

export interface DealAttachment {
  id: string
  deal_id: string
  deal_email_id: string | null
  gmail_message_id: string
  gmail_attachment_id: string
  filename: string
  mime_type: string
  size: number
  created_at: string
}

export interface DealLink {
  id: string
  deal_id: string
  url: string
  label: string | null
  source: "auto" | "manual"
  gmail_message_id: string | null
  created_at: string
}

export const STAGES: DealStage[] = ["sourced", "initial_call", "dd_in_progress", "ic_review", "committed", "passed"]

export const STAGE_LABELS: Record<DealStage, string> = {
  sourced: "Sourced",
  initial_call: "Initial Call",
  dd_in_progress: "DD In Progress",
  ic_review: "IC Review",
  committed: "Committed",
  passed: "Passed",
}

export const STAGE_COLORS: Record<DealStage, string> = {
  sourced: "bg-blue-500/20 text-blue-400",
  initial_call: "bg-yellow-500/20 text-yellow-400",
  dd_in_progress: "bg-purple-500/20 text-purple-400",
  ic_review: "bg-orange-500/20 text-orange-400",
  committed: "bg-green-500/20 text-green-400",
  passed: "bg-red-500/20 text-red-400",
}

export const PRIORITY_COLORS: Record<DealPriority, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

export const PRIORITY_DOT_COLORS: Record<DealPriority, string> = {
  high: "bg-red-400",
  medium: "",
  low: "bg-zinc-500",
}

export const INVESTMENT_TYPES: InvestmentType[] = ["SPV", "Fund", "Direct", "Co-Invest", "Other"]

export const DEAL_TYPES = [
  "Fund Allocation",
  "Co-Invest",
  "Direct",
  "Series A",
  "Series B",
  "Series C",
  "Seed",
  "Other",
]

export const INDUSTRIES = [
  "Digital Assets",
  "Fintech",
  "AI/ML",
  "Healthcare",
  "Real Estate",
  "Energy",
  "Macro",
  "Systematic",
  "Event-Driven",
  "Multi-Strategy",
  "Credit",
  "Technology",
  "Infrastructure",
  "Consumer",
  "Industrials",
  "Other",
]
