import Anthropic from "@anthropic-ai/sdk"
import type { ThreadMeta } from "@/lib/acio/gmail"

const client = new Anthropic()

export interface DealExtraction {
  company_name: string
  deal_type: string
  suggested_stage: string
  key_contacts: { name: string; email: string; role: string }[]
}

export interface BaselineClassification extends DealExtraction {
  is_deal: boolean
  reasoning: string
}

const BASELINE_PROMPT = `You are classifying email threads for an investment fund (Amitis Capital / ACDAM).
Determine if each thread represents an investment opportunity being evaluated BY Amitis.

Return JSON (no markdown, no code fences):
{
  "is_deal": true/false,
  "company_name": "extracted company or fund name",
  "deal_type": "Series A|Series B|Series C|Fund Allocation|Co-Invest|Direct|Seed|Other",
  "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
  "key_contacts": [{"name": "...", "email": "...", "role": "counterparty|internal|advisor"}],
  "reasoning": "one sentence explanation"
}

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
  "deal_type": "Series A|Series B|Series C|Fund Allocation|Co-Invest|Direct|Seed|Other",
  "suggested_stage": "sourced|initial_call|dd_in_progress|ic_review|committed|passed",
  "key_contacts": [{"name": "...", "email": "...", "role": "counterparty|internal|advisor"}]
}

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

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return JSON.parse(text)
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

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  return JSON.parse(text)
}
