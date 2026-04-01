import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id: dealId } = await params

  const { data, error } = await supabase
    .from("acio_email_attachments")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
