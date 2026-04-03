import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { parseAIResponse, extractTextFromResponse } from "@/lib/ai-parse"
import { EXPLAIN_PROMPT } from "../../_lib/learning-log-prompt"

const client = new Anthropic()

const ExplanationSchema = z.array(
  z.object({
    concept: z.string(),
    explanation: z.string(),
    content: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
  })
)

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { concepts } = await req.json()

  if (!concepts || typeof concepts !== "string") {
    return NextResponse.json({ error: "concepts is required" }, { status: 400 })
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: EXPLAIN_PROMPT(concepts),
      },
    ],
  })

  const text = extractTextFromResponse(response)
  const parsed = parseAIResponse(text, ExplanationSchema)

  const entries = parsed.map((p) => ({
    concept: p.concept,
    explanation: p.explanation,
    content: p.content,
    context: "Asked via Learning Log dashboard",
    category: p.category,
    tags: p.tags,
    source: "dashboard",
  }))

  const { data, error } = await supabase
    .from("learning_log")
    .insert(entries)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
