import type Anthropic from "@anthropic-ai/sdk"
import {
  anthropic,
  MODEL,
  MAX_TOKENS,
  MAX_LOOP_ITERATIONS,
  TRIAGE_SYSTEM_PROMPT,
} from "./anthropic"
import { TRIAGE_TOOLS, executeTriageTool, type RunStats } from "./tools"

export interface TriageRunRequest {
  hours_back: number
  query?: string
  sources?: ("gmail" | "slack" | "attio" | "tacd_iq")[]
}

export interface TriageRunResult {
  stats: RunStats
  duration_ms: number
  iterations: number
  stop_reason: "end_turn" | "max_iterations" | "error"
  final_message: string
  error?: string
}

/**
 * Run the Triage agent loop synchronously.
 *
 * V1 is Gmail-only — `sources` is accepted for forward compat but only Gmail
 * tools are wired today. Other sources will be added in later phases without
 * changing this signature.
 */
export async function runTriage(
  userId: string,
  req: TriageRunRequest,
): Promise<TriageRunResult> {
  const start = Date.now()
  const stats: RunStats = {
    threads_examined: 0,
    threads_processed: 0,
    threads_skipped: 0,
    interactions_written: 0,
    interactions_updated: 0,
    action_items_created: 0,
    action_items_updated: 0,
  }

  const sources = req.sources?.length ? req.sources : (["gmail"] as const)
  if (!sources.includes("gmail")) {
    return {
      stats,
      duration_ms: Date.now() - start,
      iterations: 0,
      stop_reason: "end_turn",
      final_message: "No supported sources requested. (V1 only ingests Gmail.)",
    }
  }

  const userPrompt =
    `Triage my last ${req.hours_back} hours of Gmail activity.` +
    (req.query ? ` Apply the additional Gmail filter: ${req.query}.` : "") +
    `\n\nFollow the workflow in your system prompt. Begin with gmail_search_recent.`

  const conversation: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ]

  // Hard wall-clock budget. 290s leaves headroom under the 300s Vercel Pro cap.
  const DEADLINE_MS = 290_000
  const deadline = start + DEADLINE_MS

  let stop: TriageRunResult["stop_reason"] = "end_turn"
  let finalText = ""
  let errorMsg: string | undefined
  let iterations = 0

  console.log(`[triage] starting run for user ${userId}, hours_back=${req.hours_back}`)

  try {
    for (let i = 0; i < MAX_LOOP_ITERATIONS; i++) {
      iterations = i + 1
      if (Date.now() > deadline) {
        console.log(`[triage] hit deadline after ${iterations - 1} iterations`)
        stop = "max_iterations"
        finalText = `Hit the ${DEADLINE_MS / 1000}s deadline after ${iterations - 1} iterations. Partial results above. Re-run with a tighter window.`
        break
      }

      console.log(`[triage] iteration ${iterations}: calling anthropic`)
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: TRIAGE_SYSTEM_PROMPT,
        tools: TRIAGE_TOOLS,
        messages: conversation,
      })

      conversation.push({ role: "assistant", content: response.content })

      // Capture the latest text output (used as the final summary).
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text",
      )
      if (textBlock?.text) finalText = textBlock.text

      if (response.stop_reason !== "tool_use") {
        console.log(`[triage] iteration ${iterations}: stop_reason=${response.stop_reason} — done`)
        stop = "end_turn"
        break
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      )
      console.log(`[triage] iteration ${iterations}: ${toolUses.length} tool calls (${toolUses.map((t) => t.name).join(", ")})`)

      // Run all tool_use blocks in this turn in parallel. The model can emit
      // multiple — e.g., find_existing_interaction for 8 threads at once — and
      // serial execution wastes most of the wall-clock budget.
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUses.map(async (block) => {
          try {
            const result = await executeTriageTool(
              userId,
              { id: block.id, name: block.name, input: block.input as Record<string, unknown> },
              stats,
            )
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: typeof result === "string" ? result : JSON.stringify(result),
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "unknown error"
            console.log(`[triage] tool ${block.name} errored: ${msg}`)
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: `Error: ${msg}`,
              is_error: true,
            }
          }
        }),
      )

      conversation.push({ role: "user", content: toolResults })

      if (i === MAX_LOOP_ITERATIONS - 1) stop = "max_iterations"
    }
  } catch (err) {
    stop = "error"
    errorMsg = err instanceof Error ? err.message : "unknown error"
    console.log(`[triage] error: ${errorMsg}`)
  }

  console.log(
    `[triage] done in ${Date.now() - start}ms · stop=${stop} · iterations=${iterations} · stats=${JSON.stringify(stats)}`,
  )

  return {
    stats,
    duration_ms: Date.now() - start,
    iterations,
    stop_reason: stop,
    final_message: finalText || "(No final summary returned.)",
    ...(errorMsg ? { error: errorMsg } : {}),
  }
}
