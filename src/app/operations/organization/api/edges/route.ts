import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("org_edges")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { source_id, target_id } = await req.json()

  if (!source_id || !target_id) {
    return NextResponse.json({ error: "source_id and target_id are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("org_edges")
    .upsert({ source_id, target_id }, { onConflict: "source_id,target_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { source_id, target_id } = await req.json()

  if (!source_id || !target_id) {
    return NextResponse.json({ error: "source_id and target_id are required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("org_edges")
    .delete()
    .eq("source_id", source_id)
    .eq("target_id", target_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
