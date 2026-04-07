import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { notion_page_id, person_id, access_level } = await req.json()

  if (!notion_page_id || !person_id) {
    return NextResponse.json({ error: "notion_page_id and person_id are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("org_notion_access")
    .upsert(
      {
        notion_page_id,
        person_id,
        access_level: access_level || "owner",
      },
      { onConflict: "person_id,notion_page_id" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { notion_page_id, person_id } = await req.json()

  if (!notion_page_id || !person_id) {
    return NextResponse.json({ error: "notion_page_id and person_id are required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("org_notion_access")
    .delete()
    .eq("notion_page_id", notion_page_id)
    .eq("person_id", person_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
