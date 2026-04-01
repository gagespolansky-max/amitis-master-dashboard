import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id: dealId } = await params

  const { data, error } = await supabase
    .from("acio_deal_links")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id: dealId } = await params
  const { url, label } = await req.json()

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })

  const { data, error } = await supabase
    .from("acio_deal_links")
    .upsert(
      { deal_id: dealId, url, label: label || null, source: "manual" },
      { onConflict: "deal_id,url" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { id } = await req.json()

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await supabase
    .from("acio_deal_links")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
