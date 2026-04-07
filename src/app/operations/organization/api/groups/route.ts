import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("org_groups")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from("org_groups")
    .insert({
      label: body.label || "New Group",
      pos_x: body.pos_x ?? 100,
      pos_y: body.pos_y ?? 100,
      width: body.width ?? 400,
      height: body.height ?? 300,
      color: body.color ?? "rgba(255,255,255,0.06)",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { id, ...fields } = await req.json()

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const key of ["label", "pos_x", "pos_y", "width", "height", "color"]) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabase
    .from("org_groups")
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

  const { error } = await supabase.from("org_groups").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
