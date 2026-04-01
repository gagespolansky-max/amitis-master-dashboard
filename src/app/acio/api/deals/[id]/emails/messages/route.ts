import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { fetchThreadMessages } from "@/lib/acio/gmail"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: dealId } = await params
  const supabase = createServerClient()
  const { searchParams } = req.nextUrl
  const dealEmailId = searchParams.get("deal_email_id")
  const threadId = searchParams.get("thread_id")

  if (!dealEmailId || !threadId) {
    return NextResponse.json({ error: "deal_email_id and thread_id required" }, { status: 400 })
  }

  // Check cache first
  const { data: cached } = await supabase
    .from("acio_email_messages")
    .select("*")
    .eq("deal_email_id", dealEmailId)
    .order("date", { ascending: true })

  if (cached && cached.length > 0) {
    return NextResponse.json(cached)
  }

  // Fetch from Gmail and cache
  try {
    const messages = await fetchThreadMessages(threadId)

    const rows = messages.map((m) => ({
      deal_email_id: dealEmailId,
      message_id: m.messageId,
      from_name: m.fromName || null,
      from_email: m.fromEmail || null,
      date: m.date ? new Date(m.date).toISOString() : null,
      subject: m.subject || null,
      body_text: m.bodyText || null,
      snippet: m.snippet || null,
    }))

    if (rows.length > 0) {
      await supabase.from("acio_email_messages").upsert(rows, {
        onConflict: "deal_email_id,message_id",
      })
    }

    // Return from DB to get generated IDs
    const { data: inserted } = await supabase
      .from("acio_email_messages")
      .select("*")
      .eq("deal_email_id", dealEmailId)
      .order("date", { ascending: true })

    return NextResponse.json(inserted || [])
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch messages"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
