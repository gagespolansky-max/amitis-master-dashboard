import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { normalizeCompanyName } from "@/app/acio/deals/_lib/dedup"
import { STAGES } from "@/app/acio/deals/_lib/types"
import type { DealStage } from "@/app/acio/deals/_lib/types"

interface DealRow {
  id: string
  company_name: string
  stage: DealStage
  status: string
  updated_at: string
  key_contacts: { name: string; email: string; role: string }[] | null
  company_description: string | null
  value_proposition: string | null
  industry: string | null
  investment_type: string | null
  notes: string | null
  priority: string
}

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }

/**
 * POST /acio/deals/api/dedup
 * Body: { dry_run?: boolean }
 *
 * Finds duplicate deal groups using normalization + containment,
 * then merges them (keeping the most-progressed deal as primary).
 * Pass dry_run: true to preview without modifying data.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const dryRun = body.dry_run === true

  const supabase = createServerClient()

  const { data: deals, error } = await supabase
    .from("acio_deals")
    .select("id, company_name, stage, status, updated_at, key_contacts, company_description, value_proposition, industry, investment_type, notes, priority")
    .not("status", "eq", "dismissed")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!deals?.length) return NextResponse.json({ groups: [], merged: 0 })

  // Build groups using normalization + bidirectional containment
  const groups: DealRow[][] = []
  const assigned = new Set<string>()

  for (let i = 0; i < deals.length; i++) {
    if (assigned.has(deals[i].id)) continue

    const group: DealRow[] = [deals[i] as DealRow]
    assigned.add(deals[i].id)
    const normI = normalizeCompanyName(deals[i].company_name)

    for (let j = i + 1; j < deals.length; j++) {
      if (assigned.has(deals[j].id)) continue
      const normJ = normalizeCompanyName(deals[j].company_name)

      if (isMatch(normI, normJ)) {
        group.push(deals[j] as DealRow)
        assigned.add(deals[j].id)
      }
    }

    if (group.length > 1) {
      groups.push(group)
    }
  }

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      groups: groups.map((g) => ({
        names: g.map((d) => d.company_name),
        primary: pickPrimary(g).company_name,
        count: g.length,
      })),
      total_duplicates: groups.reduce((sum, g) => sum + g.length - 1, 0),
    })
  }

  // Merge each group
  let totalMerged = 0
  const results: { primary: string; merged_from: string[] }[] = []

  for (const group of groups) {
    const primary = pickPrimary(group)
    const secondaries = group.filter((d) => d.id !== primary.id)

    for (const source of secondaries) {
      await mergeDeal(supabase, primary, source)
      totalMerged++
    }

    results.push({
      primary: primary.company_name,
      merged_from: secondaries.map((s) => s.company_name),
    })
  }

  return NextResponse.json({
    merged: totalMerged,
    groups: results,
  })
}

function isMatch(normA: string, normB: string): boolean {
  if (!normA || !normB) return false
  if (normA === normB) return true

  const shorter = normA.length <= normB.length ? normA : normB
  const longer = normA.length <= normB.length ? normB : normA
  return shorter.length >= 4 && longer.includes(shorter)
}

function pickPrimary(group: DealRow[]): DealRow {
  return group.sort((a, b) => {
    // Most advanced stage first
    const stageA = STAGES.indexOf(a.stage)
    const stageB = STAGES.indexOf(b.stage)
    if (stageA !== stageB) return stageB - stageA

    // Confirmed over pending_review
    if (a.status !== b.status) {
      if (a.status === "confirmed") return -1
      if (b.status === "confirmed") return 1
    }

    // Most recently updated
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })[0]
}

async function mergeDeal(
  supabase: ReturnType<typeof createServerClient>,
  target: DealRow,
  source: DealRow
) {
  // Re-link emails
  await supabase
    .from("acio_deal_emails")
    .update({ deal_id: target.id })
    .eq("deal_id", source.id)

  // Merge contacts
  const targetContacts = target.key_contacts || []
  const sourceContacts = source.key_contacts || []
  const contactEmails = new Set(targetContacts.map((c) => c.email.toLowerCase()))
  const mergedContacts = [...targetContacts]
  for (const c of sourceContacts) {
    if (!contactEmails.has(c.email.toLowerCase())) {
      mergedContacts.push(c)
      contactEmails.add(c.email.toLowerCase())
    }
  }

  // Append notes
  let mergedNotes = target.notes || ""
  if (source.notes) {
    mergedNotes += `\n---\nMerged from ${source.company_name}:\n${source.notes}`
  }

  const updates: Record<string, unknown> = {
    key_contacts: mergedContacts,
    notes: mergedNotes || null,
    company_description: target.company_description || source.company_description || null,
    value_proposition: target.value_proposition || source.value_proposition || null,
    industry: target.industry || source.industry || null,
    investment_type: target.investment_type || source.investment_type || null,
    updated_at: new Date().toISOString(),
  }

  // Keep higher priority
  const targetRank = PRIORITY_RANK[target.priority] || 2
  const sourceRank = PRIORITY_RANK[source.priority] || 2
  if (sourceRank > targetRank) {
    updates.priority = source.priority
  }

  await supabase.from("acio_deals").update(updates).eq("id", target.id)

  // Delete source
  await supabase.from("acio_deals").delete().eq("id", source.id)
}
