import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { fetchThreadMessages } from "@/app/acio/deals/_lib/gmail"
import { extractLinksFromText } from "@/app/acio/deals/_lib/links"

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

    // Extract and store attachment metadata
    const attachmentRows = messages.flatMap((m) =>
      m.attachments.map((a) => ({
        deal_id: dealId,
        deal_email_id: dealEmailId.startsWith("source-") ? null : dealEmailId,
        gmail_message_id: a.messageId,
        gmail_attachment_id: a.attachmentId,
        filename: a.filename,
        mime_type: a.mimeType,
        size: a.size,
      }))
    )

    if (attachmentRows.length > 0) {
      await supabase.from("acio_email_attachments").upsert(attachmentRows, {
        onConflict: "deal_id,gmail_message_id,gmail_attachment_id",
      })
    }

    // Extract and store links from email bodies
    const linkRows = messages.flatMap((m) =>
      extractLinksFromText(m.bodyText).map((link) => ({
        deal_id: dealId,
        url: link.url,
        label: link.label,
        source: "auto" as const,
        gmail_message_id: m.messageId,
      }))
    )

    if (linkRows.length > 0) {
      await supabase.from("acio_deal_links").upsert(linkRows, {
        onConflict: "deal_id,url",
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
