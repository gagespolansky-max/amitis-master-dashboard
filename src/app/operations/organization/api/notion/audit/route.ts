import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerClient()

  const { data: pages, error: pagesErr } = await supabase
    .from("org_notion_pages")
    .select("*")
    .order("last_edited", { ascending: false, nullsFirst: false })

  if (pagesErr) return NextResponse.json({ error: pagesErr.message }, { status: 500 })

  const { data: access, error: accessErr } = await supabase
    .from("org_notion_access")
    .select("*")

  if (accessErr) return NextResponse.json({ error: accessErr.message }, { status: 500 })

  const { data: people, error: peopleErr } = await supabase
    .from("org_people")
    .select("id, name")

  if (peopleErr) return NextResponse.json({ error: peopleErr.message }, { status: 500 })

  const nameById: Record<string, string> = {}
  for (const p of people || []) nameById[p.id] = p.name

  const accessByPage: Record<string, { person_id: string; person_name: string; access_level: string }[]> = {}
  for (const a of access || []) {
    if (!accessByPage[a.notion_page_id]) accessByPage[a.notion_page_id] = []
    accessByPage[a.notion_page_id].push({
      person_id: a.person_id,
      person_name: nameById[a.person_id] || "Unknown",
      access_level: a.access_level,
    })
  }

  const enriched = (pages || []).map((p) => ({
    ...p,
    owners: accessByPage[p.notion_page_id] || [],
  }))

  return NextResponse.json(enriched)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { notion_page_id, consolidation_status } = await req.json()

  if (!notion_page_id || !consolidation_status) {
    return NextResponse.json({ error: "notion_page_id and consolidation_status are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("org_notion_pages")
    .update({ consolidation_status })
    .eq("notion_page_id", notion_page_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
