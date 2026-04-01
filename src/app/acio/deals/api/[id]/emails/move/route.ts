import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id: sourceDealId } = await params
  const { target_deal_id, thread_id, deal_email_id } = await req.json()

  if (!target_deal_id) {
    return NextResponse.json({ error: "target_deal_id required" }, { status: 400 })
  }

  if (target_deal_id === sourceDealId) {
    return NextResponse.json({ error: "Cannot move email to the same deal" }, { status: 400 })
  }

  // Check if this is a source thread (no real deal_email_id) or a linked email
  const isSourceThread = !deal_email_id || deal_email_id.startsWith("source-")

  if (isSourceThread) {
    // Get source deal info for the thread
    const { data: sourceDeal } = await supabase
      .from("acio_deals")
      .select("source_thread_id, source_subject, key_contacts")
      .eq("id", sourceDealId)
      .single()

    if (!sourceDeal?.source_thread_id) {
      return NextResponse.json({ error: "Source thread not found on this deal" }, { status: 404 })
    }

    const sourceThreadId = sourceDeal.source_thread_id

    // Create acio_deal_emails row on target deal
    const { error: insertErr } = await supabase.from("acio_deal_emails").insert({
      deal_id: target_deal_id,
      thread_id: sourceThreadId,
      subject: sourceDeal.source_subject,
      participants: sourceDeal.key_contacts?.map((c: { name: string; email: string }) => ({
        name: c.name,
        email: c.email,
      })) || null,
    })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Clear source thread on source deal
    const { error: clearErr } = await supabase
      .from("acio_deals")
      .update({ source_thread_id: null, source_subject: null })
      .eq("id", sourceDealId)

    if (clearErr) {
      return NextResponse.json({ error: clearErr.message }, { status: 500 })
    }
  } else {
    // Regular linked email — just update deal_id
    const { error } = await supabase
      .from("acio_deal_emails")
      .update({ deal_id: target_deal_id })
      .eq("id", deal_email_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
