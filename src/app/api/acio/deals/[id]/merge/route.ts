import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id: targetId } = await params
  const { merge_from_id: sourceId } = await req.json()

  if (!sourceId) {
    return NextResponse.json({ error: "merge_from_id is required" }, { status: 400 })
  }

  if (sourceId === targetId) {
    return NextResponse.json({ error: "Cannot merge a deal with itself" }, { status: 400 })
  }

  // Fetch both deals
  const [{ data: target, error: tErr }, { data: source, error: sErr }] = await Promise.all([
    supabase.from("acio_deals").select("*").eq("id", targetId).single(),
    supabase.from("acio_deals").select("*").eq("id", sourceId).single(),
  ])

  if (tErr || !target) return NextResponse.json({ error: "Target deal not found" }, { status: 404 })
  if (sErr || !source) return NextResponse.json({ error: "Source deal not found" }, { status: 404 })

  // 1. Re-link emails from source to target
  await supabase
    .from("acio_deal_emails")
    .update({ deal_id: targetId })
    .eq("deal_id", sourceId)

  // 2. Merge contacts — deduplicate by email
  const targetContacts: { name: string; email: string; role: string }[] = target.key_contacts || []
  const sourceContacts: { name: string; email: string; role: string }[] = source.key_contacts || []
  const contactEmails = new Set(targetContacts.map((c) => c.email.toLowerCase()))
  const mergedContacts = [...targetContacts]
  for (const c of sourceContacts) {
    if (!contactEmails.has(c.email.toLowerCase())) {
      mergedContacts.push(c)
      contactEmails.add(c.email.toLowerCase())
    }
  }

  // 3. Append notes
  let mergedNotes = target.notes || ""
  if (source.notes) {
    mergedNotes += `\n---\nMerged from ${source.company_name}:\n${source.notes}`
  }

  // 4. Keep richer description fields
  const updates: Record<string, unknown> = {
    key_contacts: mergedContacts,
    notes: mergedNotes,
    company_description: target.company_description || source.company_description || null,
    value_proposition: target.value_proposition || source.value_proposition || null,
    industry: target.industry || source.industry || null,
    investment_type: target.investment_type || source.investment_type || null,
    updated_at: new Date().toISOString(),
  }

  // 5. Preserve higher priority
  const targetRank = PRIORITY_RANK[target.priority] || 2
  const sourceRank = PRIORITY_RANK[source.priority] || 2
  if (sourceRank > targetRank) {
    updates.priority = source.priority
  }

  // 6. Update target deal
  const { data: updated, error: updateErr } = await supabase
    .from("acio_deals")
    .update(updates)
    .eq("id", targetId)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 7. Delete source deal (emails already re-linked)
  await supabase.from("acio_deals").delete().eq("id", sourceId)

  return NextResponse.json(updated)
}
