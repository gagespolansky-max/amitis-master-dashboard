export type DealStage = "sourced" | "initial_call" | "dd_in_progress" | "ic_review" | "committed" | "passed"

export type DealStatus = "pending_review" | "confirmed" | "dismissed"

export type DealSource = "baseline_scan" | "label"

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
  first_seen_at: string
  stage_updated_at: string
  created_at: string
  updated_at: string
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
