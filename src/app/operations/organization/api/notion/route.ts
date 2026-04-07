import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const personId = req.nextUrl.searchParams.get("person_id")

  if (!personId) {
    return NextResponse.json({ error: "person_id is required" }, { status: 400 })
  }

  const { data: access, error: accessErr } = await supabase
    .from("org_notion_access")
    .select("notion_page_id, access_level")
    .eq("person_id", personId)

  if (accessErr) return NextResponse.json({ error: accessErr.message }, { status: 500 })
  if (!access || access.length === 0) return NextResponse.json([])

  const pageIds = access.map((a) => a.notion_page_id)

  const { data: pages, error: pagesErr } = await supabase
    .from("org_notion_pages")
    .select("*")
    .in("notion_page_id", pageIds)
    .order("teamspace", { ascending: true })
    .order("page_title", { ascending: true })

  if (pagesErr) return NextResponse.json({ error: pagesErr.message }, { status: 500 })
  return NextResponse.json(pages || [])
}
