import Anthropic from "@anthropic-ai/sdk"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { DealExtraction } from "./classify"
import type { ThreadMeta } from "./gmail"
import { STAGES } from "./types"
import type { DealStage } from "./types"

const SUFFIXES_REGEX =
  /\b(inc|llc|lp|fund|capital|management|partners|group|holdings|corp|corporation|ltd|limited|co|company|ventures|advisors|advisory)\.?\b/gi

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(SUFFIXES_REGEX, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export interface ExistingDeal {
  id: string
  company_name: string
  updated_at: string
}

export async function findMatchingDeal(
  companyName: string,
  existingDeals: ExistingDeal[]
): Promise<{ dealId: string; confidence: "exact" | "fuzzy" } | null> {
  if (!existingDeals.length) return null

  const normalized = normalizeCompanyName(companyName)
  if (!normalized) return null

  // Tier 1: fast normalization matching
  const matches: ExistingDeal[] = []
  for (const deal of existingDeals) {
    const existingNorm = normalizeCompanyName(deal.company_name)
    if (!existingNorm) continue

    // Exact match after normalization
    if (normalized === existingNorm) {
      matches.push(deal)
      continue
    }

    // Bidirectional containment with min-length guard
    const shorter = normalized.length <= existingNorm.length ? normalized : existingNorm
    const longer = normalized.length <= existingNorm.length ? existingNorm : normalized
    if (shorter.length >= 4 && longer.includes(shorter)) {
      matches.push(deal)
    }
  }

  if (matches.length > 0) {
    // Pick most recently updated
    const best = matches.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0]
    return { dealId: best.id, confidence: "exact" }
  }

  // Tier 2: Claude Haiku call
  try {
    const dealNames = existingDeals
      .map((d) => d.company_name)
      .slice(0, 30)

    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are matching company names for an investment deal tracker.

Is "${companyName}" the same company as any of these existing deals?

${dealNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Rules:
- Different fund vehicles or vintages (Fund I vs Fund II, 2024 vs 2025) are SEPARATE deals
- SPV vs main fund from the same GP are SEPARATE deals
- Abbreviations, suffixes (Inc/LLC/LP), and minor spelling variations of the SAME entity = SAME deal

Return JSON only (no markdown): {"match_index": <1-based index or null>, "reasoning": "one sentence"}`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const result = JSON.parse(text)

    if (result.match_index && result.match_index >= 1 && result.match_index <= dealNames.length) {
      const matchedName = dealNames[result.match_index - 1]
      const matchedDeal = existingDeals.find((d) => d.company_name === matchedName)
      if (matchedDeal) {
        return { dealId: matchedDeal.id, confidence: "fuzzy" }
      }
    }
  } catch (err) {
    console.error("[dedup] Haiku fuzzy match failed, creating new deal:", err)
  }

  return null
}

export async function linkThreadToExistingDeal(
  dealId: string,
  extraction: DealExtraction,
  meta: ThreadMeta,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Link the new thread
  await supabase.from("acio_deal_emails").insert({
    deal_id: dealId,
    thread_id: meta.threadId,
    subject: meta.subject,
    snippet: meta.snippet,
    last_message_date: meta.lastMessageDate,
    participants: meta.participants,
  })

  // 2. Fetch current deal to merge into
  const { data: deal } = await supabase
    .from("acio_deals")
    .select("key_contacts, company_description, value_proposition, industry, vehicle, company_stage, stage")
    .eq("id", dealId)
    .single()

  if (!deal) return

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // 3. Merge contacts — deduplicate by email
  const existingContacts: { name: string; email: string; role: string }[] = deal.key_contacts || []
  const newContacts = extraction.key_contacts || []
  if (newContacts.length > 0) {
    const contactEmails = new Set(existingContacts.map((c) => c.email.toLowerCase()))
    const merged = [...existingContacts]
    for (const c of newContacts) {
      if (!contactEmails.has(c.email.toLowerCase())) {
        merged.push(c)
        contactEmails.add(c.email.toLowerCase())
      }
    }
    updates.key_contacts = merged
  }

  // 4. Fill empty fields only
  if (!deal.company_description && extraction.company_description) {
    updates.company_description = extraction.company_description
  }
  if (!deal.value_proposition && extraction.value_proposition) {
    updates.value_proposition = extraction.value_proposition
  }
  if (!deal.industry && extraction.industry) {
    updates.industry = extraction.industry
  }
  if (!deal.vehicle && extraction.vehicle) {
    updates.vehicle = extraction.vehicle
  }
  if (!deal.company_stage && extraction.company_stage) {
    updates.company_stage = extraction.company_stage
  }

  // 5. Advance stage if new extraction suggests a more advanced stage (never downgrade)
  if (extraction.suggested_stage) {
    const currentIdx = STAGES.indexOf(deal.stage as DealStage)
    const newIdx = STAGES.indexOf(extraction.suggested_stage as DealStage)
    // "passed" is the last stage — don't auto-advance into it
    if (newIdx > currentIdx && newIdx < STAGES.length - 1) {
      updates.stage = extraction.suggested_stage
      updates.stage_updated_at = new Date().toISOString()
    }
  }

  await supabase.from("acio_deals").update(updates).eq("id", dealId)
}
