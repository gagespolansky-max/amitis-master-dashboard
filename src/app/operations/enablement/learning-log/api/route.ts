import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

const BUCKET = "learning-log-screenshots"

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("learning_log")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { id, ...fields } = await req.json()

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const key of ["concept", "explanation", "content", "context", "category", "tags", "image_urls", "is_verified"]) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("learning_log")
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

  // Fetch image_urls before deleting to clean up storage
  const { data: entry } = await supabase
    .from("learning_log")
    .select("image_urls")
    .eq("id", id)
    .single()

  if (entry?.image_urls && entry.image_urls.length > 0) {
    const fileNames = entry.image_urls
      .map((url: string) => url.split("/").pop())
      .filter(Boolean) as string[]
    if (fileNames.length > 0) {
      await supabase.storage.from(BUCKET).remove(fileNames)
    }
  }

  const { error } = await supabase.from("learning_log").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
