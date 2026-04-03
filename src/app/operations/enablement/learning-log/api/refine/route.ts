import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { safeParseAIResponse, extractTextFromResponse } from "@/lib/ai-parse"
import { REFINE_SYSTEM_PROMPT } from "../../_lib/learning-log-prompt"

const client = new Anthropic()

const RefineResponseSchema = z.object({
  message: z.string(),
  suggested_updates: z
    .object({
      concept: z.string().optional(),
      explanation: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .nullable(),
})

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { entryId, message, chatHistory, currentContent } = await req.json()

  if (!entryId || !message) {
    return NextResponse.json({ error: "entryId and message are required" }, { status: 400 })
  }

  const systemPrompt = REFINE_SYSTEM_PROMPT(currentContent)

  // Build clean message history — just the raw user/assistant messages
  const messages: Array<{ role: "user" | "assistant"; content: string }> = []
  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }
  messages.push({ role: "user", content: message })

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: systemPrompt,
    messages,
  })

  const text = extractTextFromResponse(response)
  const parsed = safeParseAIResponse(text, RefineResponseSchema)

  if (!parsed.success) {
    // Fallback: treat the raw text as the message, no suggested updates
    const fallbackMessage = text.length > 500 ? text.slice(0, 500) + "..." : text
    const newHistory = [
      ...(chatHistory || []),
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: fallbackMessage },
    ]

    await supabase
      .from("learning_log")
      .update({ chat_history: newHistory, updated_at: new Date().toISOString() })
      .eq("id", entryId)

    return NextResponse.json({
      message: fallbackMessage,
      suggested_updates: null,
      entry: null,
    })
  }

  const { message: aiMessage, suggested_updates } = parsed.data

  // Only save chat history — do NOT auto-apply suggested updates
  // The client handles granular accept/reject
  const newHistory = [
    ...(chatHistory || []),
    { role: "user" as const, content: message },
    { role: "assistant" as const, content: aiMessage },
  ]

  const { data } = await supabase
    .from("learning_log")
    .update({ chat_history: newHistory, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .select()
    .single()

  return NextResponse.json({
    message: aiMessage,
    suggested_updates,
    entry: data,
  })
}
