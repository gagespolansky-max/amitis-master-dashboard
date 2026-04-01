import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_initiatives")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { input } = await req.json()

  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input is required" }, { status: 400 })
  }

  // Get existing initiatives for context
  const { data: existing } = await supabase
    .from("ai_initiatives")
    .select("title, status")
    .order("created_at", { ascending: false })
    .limit(20)

  const existingContext = existing && existing.length > 0
    ? `\nExisting initiatives for reference (avoid duplicates):\n${existing.map((e) => `- ${e.title} (${e.status})`).join("\n")}`
    : ""

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are helping build out an AI initiative card for Amitis Capital's master dashboard.
The user typed a quick headline/description. Expand it into a structured initiative.

Return JSON only (no markdown, no code fences):
{
  "title": "concise initiative title (5-8 words max)",
  "summary": "one-sentence summary of what this initiative does",
  "description": "2-3 sentence description with specifics — what it does, how it works, what it integrates with",
  "status": "idea|scoping|in_progress|testing|shipped",
  "priority": "high|medium|low",
  "category": "one of: Automation, Integration, Workflow, Tool, Infrastructure",
  "business_segment": "which part of the business this serves — e.g. Deal Flow, Portfolio, Operations, Investor Relations, Research",
  "requirements": ["list of 2-4 key requirements or dependencies as strings"]
}

Context:
- Amitis Capital is a hedge fund allocator / family office
- The master dashboard houses all workflows: ACIO deal flow, fund returns, skills hub, enablement, etc.
- Current tech: Next.js, Supabase, Claude API, Gmail API, Vercel
- The ACIO module tracks investment deal flow from Gmail emails
${existingContext}

If the status is unclear, default to "idea". Judge priority by business impact.

User input: "${input}"`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const parsed = JSON.parse(text)

  const { data, error } = await supabase
    .from("ai_initiatives")
    .insert({
      title: parsed.title,
      summary: parsed.summary,
      description: parsed.description,
      status: parsed.status,
      priority: parsed.priority,
      category: parsed.category,
      business_segment: parsed.business_segment,
      requirements: parsed.requirements,
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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of ["title", "summary", "description", "status", "priority", "category", "business_segment", "requirements", "progress_notes", "target_date", "linked_skills", "linked_proposals"]) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabase
    .from("ai_initiatives")
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

  const { error } = await supabase.from("ai_initiatives").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
