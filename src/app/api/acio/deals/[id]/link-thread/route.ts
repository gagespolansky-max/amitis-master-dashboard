import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabase
    .from("acio_deal_emails")
    .insert({
      deal_id: id,
      thread_id: body.thread_id,
      subject: body.subject || null,
      snippet: body.snippet || null,
      last_message_date: body.last_message_date || null,
      participants: body.participants || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
