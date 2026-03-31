import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.stage !== undefined) {
    updates.stage = body.stage
    updates.stage_updated_at = new Date().toISOString()
  }
  if (body.status !== undefined) updates.status = body.status
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.memo_url !== undefined) updates.memo_url = body.memo_url
  if (body.memo_filename !== undefined) updates.memo_filename = body.memo_filename
  if (body.company_name !== undefined) updates.company_name = body.company_name
  if (body.deal_type !== undefined) updates.deal_type = body.deal_type
  if (body.key_contacts !== undefined) updates.key_contacts = body.key_contacts

  const { data, error } = await supabase
    .from("acio_deals")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params

  const { error } = await supabase.from("acio_deals").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
