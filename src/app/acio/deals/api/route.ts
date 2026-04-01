import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = req.nextUrl
  const stage = searchParams.get("stage")
  const status = searchParams.get("status")
  const source = searchParams.get("source")

  let query = supabase.from("acio_deals").select("*").order("created_at", { ascending: false })

  if (stage) query = query.eq("stage", stage)
  if (status) query = query.eq("status", status)
  if (source) query = query.eq("source", source)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from("acio_deals")
    .insert({
      company_name: body.company_name,
      deal_type: body.deal_type || null,
      stage: body.stage || "sourced",
      status: body.status || "confirmed",
      source: body.source || "label",
      source_thread_id: body.source_thread_id || null,
      source_subject: body.source_subject || null,
      key_contacts: body.key_contacts || null,
      notes: body.notes || null,
      priority: body.priority || "medium",
      industry: body.industry || null,
      vehicle: body.vehicle || null,
      company_stage: body.company_stage || null,
      company_description: body.company_description || null,
      value_proposition: body.value_proposition || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
