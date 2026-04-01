import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { fetchThreadMessages } from "@/app/acio/_lib/gmail"
import { enrichDealFromEmails } from "@/app/acio/_lib/classify"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id: dealId } = await params

  // Fetch the deal
  const { data: deal, error: dealErr } = await supabase
    .from("acio_deals")
    .select("*")
    .eq("id", dealId)
    .single()

  if (dealErr || !deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

  // Fetch all linked email threads
  const { data: dealEmails } = await supabase
    .from("acio_deal_emails")
    .select("id, thread_id")
    .eq("deal_id", dealId)

  // Also include the source thread if not already linked
  const threadIds = new Set((dealEmails || []).map((e) => e.thread_id))
  if (deal.source_thread_id) threadIds.add(deal.source_thread_id)

  // Gather messages — check cache first, fetch from Gmail if needed
  const allMessages: { from_email: string; date: string; body_text: string }[] = []

  for (const threadId of threadIds) {
    // Find the deal_email_id for cache lookup
    const dealEmail = (dealEmails || []).find((e) => e.thread_id === threadId)

    if (dealEmail) {
      // Check cache
      const { data: cached } = await supabase
        .from("acio_email_messages")
        .select("from_email, date, body_text")
        .eq("deal_email_id", dealEmail.id)
        .order("date", { ascending: true })

      if (cached && cached.length > 0) {
        for (const m of cached) {
          if (m.body_text) allMessages.push({ from_email: m.from_email || "", date: m.date || "", body_text: m.body_text })
        }
        continue
      }
    }

    // Fetch from Gmail
    try {
      const messages = await fetchThreadMessages(threadId)
      for (const m of messages) {
        if (m.bodyText) allMessages.push({ from_email: m.fromEmail || "", date: m.date || "", body_text: m.bodyText })
      }

      // Cache the messages if we have a deal_email_id
      if (dealEmail && messages.length > 0) {
        const rows = messages.map((m) => ({
          deal_email_id: dealEmail.id,
          message_id: m.messageId,
          from_name: m.fromName || null,
          from_email: m.fromEmail || null,
          date: m.date ? new Date(m.date).toISOString() : null,
          subject: m.subject || null,
          body_text: m.bodyText || null,
          snippet: m.snippet || null,
        }))
        await supabase.from("acio_email_messages").upsert(rows, { onConflict: "deal_email_id,message_id" })
      }
    } catch {
      // Skip threads we can't fetch
    }
  }

  if (allMessages.length === 0) {
    return NextResponse.json({ error: "No email messages found to enrich from" }, { status: 400 })
  }

  // Run enrichment via Claude
  const enriched = await enrichDealFromEmails(
    {
      company_name: deal.company_name,
      company_description: deal.company_description,
      value_proposition: deal.value_proposition,
      industry: deal.industry,
      investment_type: deal.investment_type,
    },
    allMessages
  )

  // Update the deal
  const { data: updated, error: updateErr } = await supabase
    .from("acio_deals")
    .update({
      company_description: enriched.company_description,
      value_proposition: enriched.value_proposition,
      industry: enriched.industry,
      investment_type: enriched.investment_type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json(updated)
}
