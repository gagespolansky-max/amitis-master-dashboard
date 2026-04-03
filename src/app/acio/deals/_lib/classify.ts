import Anthropic from "@anthropic-ai/sdk"
import type { ThreadMeta } from "./gmail"
import { safeParseAIResponse, extractTextFromResponse } from "@/lib/ai-parse"
import { BaselineClassificationSchema, DealExtractionSchema, EnrichmentResponseSchema } from "./types"
import type { z } from "zod"

const client = new Anthropic()

export type DealExtraction = z.infer<typeof DealExtractionSchema>
export type BaselineClassification = z.infer<typeof BaselineClassificationSchema>

const BASELINE_PROMPT = `You are classifying email threads for an investment fund (Amitis Capital / ACDAM).
Determine if each thread represents an investment opportunity being evaluated BY Amitis.

Return JSON (no markdown, no code fences):
{
  "is_deal": true/false,
  "company_name": "extracted company or fund name",
  "deal_type": "fund_allocation|co_invest|direct" or null,
  "vehicle": "spv|direct_equity|safe_convertible" or null,
  "company_stage": "pre_seed|seed|series_a|series_b|series_c_plus" or null,
  "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
  "key_contacts": [{"name": "...", "email": "...", "role": "counterparty|internal|advisor"}],
  "industry": "sector/industry (e.g. Fintech, Healthcare, AI/ML, Real Estate, Energy, etc.)",
  "company_description": "1-2 sentence description of the company/fund and what they do",
  "value_proposition": "1 sentence on why this is relevant to Amitis Capital",
  "reasoning": "one sentence explanation"
}

deal_type categories:
- fund_allocation: Allocating to an external hedge fund, fund of funds, or managed account
- co_invest: Co-investing alongside a GP into a specific company/deal
- direct: Direct investment into a company (equity, SPV, SAFE, etc.)

vehicle (only for co_invest or direct):
- spv: Special purpose vehicle
- direct_equity: Direct equity stake
- safe_convertible: SAFE note or convertible instrument

company_stage (only for co_invest or direct):
- pre_seed, seed, series_a, series_b, series_c_plus

Context:
- Amitis Capital team: Chris Solarz (CIO), Adam Feldheim (Managing Partner), Gage Spolansky (Investment Team), Monica Monajem, Noel Teow
- Internal domains: @amitiscapital.com, @theamitisgroup.com
- Fund admin: Oakbridge (@oakbridgegroup.com) — NOT deals
- Fund vehicles: ACDAM (main fund)

IMPORTANT — These are NOT investment opportunities:
- Internal operations, fund admin, NAV calculations
- Capital calls/redemptions for EXISTING investments (DBA, Edge, etc.)
- LP/investor communications where OTHERS are doing DD on Amitis
- Newsletters and marketing emails
- Scheduling logistics without deal context`

const LABEL_PROMPT = `Extract deal metadata from this email thread. This has already been identified as
an investment opportunity by the user — do NOT question whether it's a deal.

Return JSON (no markdown, no code fences):
{
  "company_name": "the company or fund being evaluated",
  "deal_type": "fund_allocation|co_invest|direct" or null,
  "vehicle": "spv|direct_equity|safe_convertible" or null,
  "company_stage": "pre_seed|seed|series_a|series_b|series_c_plus" or null,
  "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
  "key_contacts": [{"name": "...", "email": "...", "role": "counterparty|internal|advisor"}],
  "industry": "sector/industry (e.g. Fintech, Healthcare, AI/ML, Real Estate, Energy, etc.)",
  "company_description": "1-2 sentence description of the company/fund and what they do",
  "value_proposition": "1 sentence on why this is relevant to Amitis Capital"
}

deal_type: fund_allocation (allocating to a fund), co_invest (alongside a GP), direct (direct into a company)
vehicle (only for co_invest/direct): spv, direct_equity, safe_convertible
company_stage (only for co_invest/direct): seed, series_a, series_b, series_c_plus

Determine the stage based on conversation progression:
- sourced: Just an intro, pitch received, or first contact
- initial_call: A call has been scheduled or just happened
- dd_in_progress: Materials exchanged, multiple DD calls, data room access
- ic_review: References to investment committee, IC memo, final decision
- committed: Terms agreed, subscription docs, closing
- passed: Explicit pass or decline

Amitis Capital team (mark as "internal"): Chris Solarz, Adam Feldheim, Gage Spolansky, Monica Monajem, Noel Teow
Domains: @amitiscapital.com, @theamitisgroup.com`

export async function classifyThread(thread: ThreadMeta): Promise<BaselineClassification> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${BASELINE_PROMPT}\n\nThread data:\n${JSON.stringify(thread, null, 2)}`,
      },
    ],
  })

  const text = extractTextFromResponse(response)
  const result = safeParseAIResponse(text, BaselineClassificationSchema)
  if (!result.success) {
    console.error("classifyThread parse error:", result.error)
    throw new Error(`Failed to parse classification response: ${result.error}`)
  }
  return result.data
}

const ENRICH_PROMPT = `You are enriching deal metadata for Amitis Capital's deal tracker.
You have access to the full email bodies from threads related to this deal.

Given the current deal info and the email messages, return improved JSON (no markdown, no code fences):
{
  "company_description": "2-3 sentences describing what this company/fund does, with concrete details from the emails (strategy, AUM, team, track record, etc.)",
  "value_proposition": "1-2 sentences on why this opportunity is specifically relevant to Amitis Capital — what makes it a fit for an alternatives allocator",
  "industry": "refined industry/sector classification",
  "deal_type": "fund_allocation|co_invest|direct" or null,
  "vehicle": "spv|direct_equity|safe_convertible" or null,
  "company_stage": "pre_seed|seed|series_a|series_b|series_c_plus" or null
}

deal_type: fund_allocation (allocating to a fund), co_invest (alongside a GP), direct (direct into a company)
vehicle (only for co_invest/direct): spv, direct_equity, safe_convertible
company_stage (only for co_invest/direct): seed, series_a, series_b, series_c_plus

Context:
- Amitis Capital is a hedge fund allocator / family office in the alternatives space
- They invest in hedge funds, SPVs, co-investments, and direct deals
- Focus areas include digital assets, macro, systematic, event-driven, and technology
- Team: Chris Solarz (CIO), Adam Feldheim (Managing Partner), Gage Spolansky (Investment Team)

Write descriptions that would be useful for an investment professional reviewing this deal.
Be specific — use numbers, names, strategies, and details from the emails.
If the emails don't contain enough info for a field, keep or improve the existing value.`

export async function enrichDealFromEmails(
  currentDeal: { company_name: string; company_description: string | null; value_proposition: string | null; industry: string | null; deal_type: string | null; vehicle: string | null; company_stage: string | null },
  messages: { from_email: string; date: string; body_text: string }[]
): Promise<z.infer<typeof EnrichmentResponseSchema>> {
  // Trim messages to avoid token limits — take most recent 10, truncate bodies
  const trimmed = messages.slice(-10).map((m) => ({
    from: m.from_email,
    date: m.date,
    body: m.body_text.slice(0, 3000),
  }))

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${ENRICH_PROMPT}\n\nCurrent deal:\n${JSON.stringify(currentDeal, null, 2)}\n\nEmail messages:\n${JSON.stringify(trimmed, null, 2)}`,
      },
    ],
  })

  const text = extractTextFromResponse(response)
  const result = safeParseAIResponse(text, EnrichmentResponseSchema)
  if (!result.success) {
    console.error("enrichDealFromEmails parse error:", result.error)
    throw new Error(`Failed to parse enrichment response: ${result.error}`)
  }
  return result.data
}

export async function extractDealMetadata(thread: ThreadMeta): Promise<DealExtraction> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${LABEL_PROMPT}\n\nThread data:\n${JSON.stringify(thread, null, 2)}`,
      },
    ],
  })

  const text = extractTextFromResponse(response)
  const result = safeParseAIResponse(text, DealExtractionSchema)
  if (!result.success) {
    console.error("extractDealMetadata parse error:", result.error)
    throw new Error(`Failed to parse deal metadata response: ${result.error}`)
  }
  return result.data
}
