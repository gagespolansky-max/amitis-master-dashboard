import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()

  const { data: responsibilities, error: respErr } = await supabase
    .from("org_responsibilities")
    .select("*")
    .order("category", { ascending: true })
    .order("area", { ascending: true })

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 })

  const { data: assignments, error: assignErr } = await supabase
    .from("org_responsibility_assignments")
    .select("*")

  if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 })

  return NextResponse.json({ responsibilities, assignments })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { area, category } = await req.json()

  if (!area) return NextResponse.json({ error: "area is required" }, { status: 400 })

  const { data, error } = await supabase
    .from("org_responsibilities")
    .insert({ area, category: category || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { person_id, responsibility_id, role } = await req.json()

  if (!person_id || !responsibility_id) {
    return NextResponse.json({ error: "person_id and responsibility_id are required" }, { status: 400 })
  }

  if (!role) {
    const { error } = await supabase
      .from("org_responsibility_assignments")
      .delete()
      .eq("person_id", person_id)
      .eq("responsibility_id", responsibility_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: "removed" })
  }

  const { data, error } = await supabase
    .from("org_responsibility_assignments")
    .upsert(
      { person_id, responsibility_id, role },
      { onConflict: "person_id,responsibility_id" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  await supabase.from("org_responsibility_assignments").delete().eq("responsibility_id", id)
  const { error } = await supabase.from("org_responsibilities").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
