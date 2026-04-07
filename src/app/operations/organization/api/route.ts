import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()

  const { data: people, error: peopleErr } = await supabase
    .from("org_people")
    .select("*")
    .order("sort_order", { ascending: true })

  if (peopleErr) return NextResponse.json({ error: peopleErr.message }, { status: 500 })

  const { data: techStack, error: techErr } = await supabase
    .from("org_tech_stack")
    .select("*")

  if (techErr) return NextResponse.json({ error: techErr.message }, { status: 500 })

  const techByPerson: Record<string, typeof techStack> = {}
  for (const item of techStack || []) {
    if (!techByPerson[item.person_id]) techByPerson[item.person_id] = []
    techByPerson[item.person_id].push(item)
  }

  const enriched = (people || []).map((p) => ({
    ...p,
    tech_stack: techByPerson[p.id] || [],
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { tech_stack, ...personFields } = body

  const { data: person, error } = await supabase
    .from("org_people")
    .insert(personFields)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (tech_stack && Array.isArray(tech_stack) && tech_stack.length > 0) {
    const items = tech_stack.map((t: { tool_name: string; category?: string }) => ({
      person_id: person.id,
      tool_name: t.tool_name,
      category: t.category || null,
    }))
    await supabase.from("org_tech_stack").insert(items)
  }

  return NextResponse.json(person)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { id, ...fields } = await req.json()

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of ["name", "title", "email", "job_description", "responsibilities", "team", "parent_id", "entity", "location", "status", "sort_order", "pos_x", "pos_y"]) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabase
    .from("org_people")
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

  const { error } = await supabase.from("org_people").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
