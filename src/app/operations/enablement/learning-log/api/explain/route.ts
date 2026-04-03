import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { parseAIResponse, extractTextFromResponse } from "@/lib/ai-parse"

const client = new Anthropic()

const ExplanationSchema = z.array(
  z.object({
    concept: z.string(),
    explanation: z.string(),
    category: z.enum(["databases", "api", "infrastructure", "frontend", "ai", "devops", "general"]),
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
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are explaining technical concepts to an investment professional who is self-taught on the technical side. He works at a hedge fund / family office and builds internal tools with Next.js, Supabase, and Python.

For each concept below, provide:
1. A short, clear name for the concept
2. A 2-4 sentence plain-English explanation. No jargon in the explanation itself. Use analogies from finance/investing where possible (e.g. comparing a database index to a fund's ticker lookup).
3. A category: one of "databases", "api", "infrastructure", "frontend", "ai", "devops", "general"

Return JSON only (no markdown, no code fences) — an array of objects:
[{"concept": "...", "explanation": "...", "category": "..."}]

Concepts to explain:
${concepts}`,
      },
    ],
  })

  const text = extractTextFromResponse(response)
  const parsed = parseAIResponse(text, ExplanationSchema)

  const entries = parsed.map((p) => ({
    concept: p.concept,
    explanation: p.explanation,
    context: "Asked via Learning Log dashboard",
    category: p.category,
  }))

  const { data, error } = await supabase
    .from("learning_log")
    .insert(entries)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
