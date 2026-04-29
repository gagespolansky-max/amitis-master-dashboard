import type Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import {
  anthropic,
  MODEL,
  MAX_TOKENS,
  MAX_LOOP_ITERATIONS,
  getCosConfig,
  type CosMode,
} from "@/app/oig/cos/_lib/anthropic"
import { executeCosTool } from "@/app/oig/cos/_lib/cos-tools"
import {
  createConversation,
  loadConversation,
  appendMessages,
  deriveTitle,
} from "@/app/oig/_shared/persistence"

export const runtime = "nodejs"
export const maxDuration = 300

const AGENT_SLUG = "chief-of-staff"
const DEADLINE_MS = 290_000

interface ChatRequest {
  conversation_id?: string
  content: string
  mode?: CosMode
}

export async function POST(req: Request) {
  let user
  try {
    user = await requireAgentAccess(AGENT_SLUG)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  let body: ChatRequest
  try {
    body = (await req.json()) as ChatRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  const start = Date.now()
  const deadline = start + DEADLINE_MS

  // Resolve or create the conversation.
  let conversationId = body.conversation_id
  let isNewConversation = false
  let priorMessages: Anthropic.MessageParam[] = []
  if (conversationId) {
    try {
      const convo = await loadConversation(conversationId, user.id, AGENT_SLUG)
      priorMessages = convo.messages
    } catch (e) {
      const msg = e instanceof Error ? e.message : "load failed"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  } else {
    conversationId = await createConversation(user.id, AGENT_SLUG, deriveTitle(body.content))
    isNewConversation = true
  }

  const mode: CosMode = body.mode === "ephemeral" ? "ephemeral" : "structured"
  const cosConfig = getCosConfig(mode)

  const userTurn: Anthropic.MessageParam = { role: "user", content: body.content }
  const conversation: Anthropic.MessageParam[] = [...priorMessages, userTurn]

  // Records to persist after the run completes successfully.
  const newMessages: Array<{
    role: "user" | "assistant"
    content_json: Anthropic.MessageParam["content"]
  }> = [{ role: "user", content_json: body.content }]

  let stop: "end_turn" | "max_iterations" | "deadline" | "error" = "end_turn"
  let finalText = ""
  let errorMsg: string | undefined
  let iterations = 0

  console.log(`[cos] run start user=${user.id} convo=${conversationId} mode=${mode} prior_msgs=${priorMessages.length}`)

  try {
    for (let i = 0; i < MAX_LOOP_ITERATIONS; i++) {
      iterations = i + 1
      if (Date.now() > deadline) {
        stop = "deadline"
        finalText = finalText || "(Hit the response deadline before finishing.)"
        break
      }

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: cosConfig.systemPrompt,
        tools: cosConfig.tools,
        messages: conversation,
      })

      conversation.push({ role: "assistant", content: response.content })
      newMessages.push({ role: "assistant", content_json: response.content })

      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text",
      )
      if (textBlock?.text) finalText = textBlock.text

      if (response.stop_reason !== "tool_use") {
        stop = "end_turn"
        break
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      )
      console.log(`[cos] iter ${iterations}: ${toolUses.length} tools (${toolUses.map((t) => t.name).join(", ")})`)

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (block) => {
          try {
            const result = await executeCosTool(user.id, {
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            })
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: typeof result === "string" ? result : JSON.stringify(result),
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "unknown error"
            console.log(`[cos] tool ${block.name} errored: ${msg}`)
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: `Error: ${msg}`,
              is_error: true,
            }
          }
        }),
      )

      const userToolResultsTurn: Anthropic.MessageParam = { role: "user", content: toolResults }
      conversation.push(userToolResultsTurn)
      newMessages.push({ role: "user", content_json: toolResults })

      if (i === MAX_LOOP_ITERATIONS - 1) stop = "max_iterations"
    }
  } catch (err) {
    stop = "error"
    errorMsg = err instanceof Error ? err.message : "unknown error"
    console.log(`[cos] error: ${errorMsg}`)
  }

  // Persist the full turn block atomically.
  try {
    await appendMessages(conversationId, newMessages)
    if (isNewConversation && finalText) {
      // Re-derive title from the FIRST user message, capped — already handled above.
      // Nothing to do here unless the title needs regenerating.
    }
  } catch (e) {
    console.log(`[cos] persist failed: ${e instanceof Error ? e.message : e}`)
  }

  const duration_ms = Date.now() - start
  console.log(
    `[cos] done in ${duration_ms}ms · stop=${stop} · iters=${iterations} · convo=${conversationId}`,
  )

  return NextResponse.json({
    conversation_id: conversationId,
    is_new_conversation: isNewConversation,
    final_message: finalText || "(No response.)",
    iterations,
    stop_reason: stop,
    duration_ms,
    ...(errorMsg ? { error: errorMsg } : {}),
  })
}
