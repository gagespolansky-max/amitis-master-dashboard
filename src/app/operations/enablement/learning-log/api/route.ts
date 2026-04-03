import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("learning_log")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { id, ...fields } = await req.json()

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const key of ["concept", "explanation", "context", "category"]) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabase
    .from("learning_log")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const { error } = await supabase.from("learning_log").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
