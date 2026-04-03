import { z } from 'zod'

export type DealStage = "sourced" | "initial_call" | "dd_in_progress" | "ic_review" | "committed" | "passed"

export type DealStatus = "pending_review" | "confirmed" | "dismissed"

export type DealSource = "baseline_scan" | "label"

export type DealPriority = "high" | "medium" | "low"

export type DealType = "fund_allocation" | "co_invest" | "direct"

export type Vehicle = "spv" | "direct_equity" | "safe_convertible"

export type CompanyStage = "pre_seed" | "seed" | "series_a" | "series_b" | "series_c_plus"

// --- Zod schemas for Claude response validation ---

const DealTypeEnum = z.enum(["fund_allocation", "co_invest", "direct"])
const VehicleEnum = z.enum(["spv", "direct_equity", "safe_convertible"])
const CompanyStageEnum = z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c_plus"])
const DealStageEnum = z.enum(["sourced", "initial_call", "dd_in_progress", "ic_review", "committed", "passed"])

const KeyContactSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.string(),
})

export const DealExtractionSchema = z.object({
  company_name: z.string(),
  deal_type: DealTypeEnum.nullable().default(null),
  vehicle: VehicleEnum.nullable().default(null),
  company_stage: CompanyStageEnum.nullable().default(null),
  suggested_stage: z.string().default("sourced"),
  key_contacts: z.array(KeyContactSchema).default([]),
  industry: z.string().nullable().default(null),
  company_description: z.string().nullable().default(null),
  value_proposition: z.string().nullable().default(null),
})

export const BaselineClassificationSchema = DealExtractionSchema.extend({
  is_deal: z.boolean(),
  reasoning: z.string().default(""),
})

export const EnrichmentResponseSchema = z.object({
  company_description: z.string(),
  value_proposition: z.string(),
  industry: z.string(),
  deal_type: DealTypeEnum.nullable().default(null),
  vehicle: VehicleEnum.nullable().default(null),
  company_stage: CompanyStageEnum.nullable().default(null),
})

export const DealPatchSchema = z.object({
  stage: DealStageEnum.optional(),
  status: z.enum(["pending_review", "confirmed", "dismissed"]).optional(),
  notes: z.string().nullable().optional(),
  memo_url: z.string().nullable().optional(),
  memo_filename: z.string().nullable().optional(),
  company_name: z.string().optional(),
  deal_type: DealTypeEnum.nullable().optional(),
  key_contacts: z.array(KeyContactSchema).nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  industry: z.string().nullable().optional(),
  vehicle: VehicleEnum.nullable().optional(),
  company_stage: CompanyStageEnum.nullable().optional(),
  company_description: z.string().nullable().optional(),
  value_proposition: z.string().nullable().optional(),
  reminder_date: z.string().nullable().optional(),
  reminder_note: z.string().nullable().optional(),
})

export interface Deal {
  id: string
  company_name: string
  deal_type: DealType | null
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
  vehicle: Vehicle | null
  company_stage: CompanyStage | null
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

export const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: "fund_allocation", label: "Fund Allocation" },
  { value: "co_invest", label: "Co-Invest" },
  { value: "direct", label: "Direct" },
]

export const VEHICLES: { value: Vehicle; label: string }[] = [
  { value: "spv", label: "SPV" },
  { value: "direct_equity", label: "Direct Equity" },
  { value: "safe_convertible", label: "SAFE / Convertible" },
]

export const COMPANY_STAGES: { value: CompanyStage; label: string }[] = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c_plus", label: "Series C+" },
]

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  fund_allocation: "Fund Allocation",
  co_invest: "Co-Invest",
  direct: "Direct",
}

export const VEHICLE_LABELS: Record<Vehicle, string> = {
  spv: "SPV",
  direct_equity: "Direct Equity",
  safe_convertible: "SAFE / Convertible",
}

export const COMPANY_STAGE_LABELS: Record<CompanyStage, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c_plus: "Series C+",
}

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
