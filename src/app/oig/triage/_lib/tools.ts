import type Anthropic from "@anthropic-ai/sdk"
import {
  fetchThreadMessages,
  fetchThreadMeta,
  searchThreads,
  getGmailClientForUser,
} from "@/app/acio/deals/_lib/gmail"
import {
  processThread,
  type ProcessThreadInput,
  type OigInteractionType,
  type OigPriority,
  type OigOrgType,
} from "../../_shared/db"

// ============================================================================
// Triage agent tools — V2 consolidated.
//
// Two tools, atomic per call:
//   1. fetch_recent_gmail — server fetches metadata + bodies in one call
//   2. process_thread — server does dedup + org/person resolution + interaction
//      upsert + action_item dedup/write atomically per thread
//
// Agent typically converges in 3 iterations:
//   iter 1: fetch_recent_gmail (1 call)
//   iter 2: process_thread × N in parallel (N calls in 1 turn)
//   iter 3: stop_reason=end_turn (final summary)
// ============================================================================

export const TRIAGE_TOOLS: Anthropic.Tool[] = [
  {
    name: "fetch_recent_gmail",
    description:
      "Fetch metadata + full body text for up to 5 recent Gmail threads in one call. Returns everything you need to decide and process each thread — no separate get_thread step needed.",
    input_schema: {
      type: "object",
      properties: {
        hours_back: {
          type: "number",
          description: "How many hours back to search.",
        },
        query: {
          type: "string",
          description:
            "Optional Gmail filter (e.g., '-from:noreply', 'is:unread'). Leave empty for default.",
        },
        limit: {
          type: "number",
          description: "Max threads to return. Hard cap is 5.",
        },
      },
      required: ["hours_back"],
    },
  },
  {
    name: "process_thread",
    description:
      "Atomic per-thread Triage write. Server-side: resolves organization (by domain) + primary person (by email) + upserts the interaction + dedups + writes any action items, all in one call. Idempotent on (source_type, source_id) so re-running is safe. Use `relevant: false` with a `reason` to skip a thread; only the relevance decision is recorded then. **Call this in parallel for all threads in one turn — do not call it sequentially.**",
    input_schema: {
      type: "object",
      properties: {
        source_type: { type: "string", enum: ["gmail", "slack", "attio", "tacd_iq", "manual"] },
        source_id: { type: "string", description: "Native id (Gmail message id of the latest message)." },
        thread_id: { type: "string", description: "Native thread id (when applicable)." },
        occurred_at: { type: "string", description: "ISO 8601 timestamp of the latest message." },
        relevant: {
          type: "boolean",
          description:
            "Whether this thread should be recorded. False for internal-only, automated noise, marketing, etc.",
        },
        reason: {
          type: "string",
          description:
            "When relevant=false, a short reason (e.g., 'internal-only', 'automated notification', 'marketing'). Used in the run summary.",
        },
        title: { type: "string" },
        clean_summary: {
          type: "string",
          description:
            "1–3 sentence factual summary of what this interaction is about. Required when relevant=true. This is what Chief of Staff reads.",
        },
        interaction_type: {
          type: "string",
          enum: ["email", "thread", "dm", "call", "meeting", "transcript", "note"],
        },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Source/business/risk tags from the documented vocabulary (gmail, investor, urgent, deadline_risk, etc.).",
        },
        organization: {
          type: "object",
          description: "External counterparty organization. Use the email domain when known.",
          properties: {
            name: { type: "string" },
            domain: { type: "string" },
            org_type: {
              type: "string",
              enum: ["customer", "prospect", "investor", "partner", "vendor", "internal"],
            },
          },
          required: ["name"],
        },
        primary_person: {
          type: "object",
          description: "The most relevant external counterparty person on the thread.",
          properties: {
            full_name: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
            relationship_type: { type: "string" },
          },
          required: ["full_name"],
        },
        action_items: {
          type: "array",
          description:
            "Grounded asks/commitments/deadlines/decisions extracted from this thread. Empty when the thread is informational. Server dedups by title against any existing open items on the same thread, so re-running is safe.",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Imperative, concrete (e.g., 'Reply to Sarah on Q4 fee accrual').",
              },
              description: { type: "string" },
              due_date: { type: "string", description: "ISO YYYY-MM-DD when stated/strongly implied." },
              priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
              category: {
                type: "string",
                description:
                  "reply_needed, follow_up, decision_needed, scheduling, research, deliverable, approval, meeting_prep.",
              },
              confidence: {
                type: "number",
                description: "0–1. <0.6 → server auto-tags 'low_confidence'.",
              },
              owner_email: { type: "string", description: "Owner's email (Gage usually)." },
              requested_by_email: { type: "string", description: "Requester's email." },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["title"],
          },
        },
      },
      required: ["source_type", "source_id", "occurred_at", "relevant"],
    },
  },
]

// ----------------------------------------------------------------------------
// Executor
// ----------------------------------------------------------------------------

export interface ToolUseBlock {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface RunStats {
  threads_examined: number
  threads_processed: number
  threads_skipped: number
  interactions_written: number
  interactions_updated: number
  action_items_created: number
  action_items_updated: number
}

export async function executeTriageTool(
  userId: string,
  block: ToolUseBlock,
  stats: RunStats,
): Promise<unknown> {
  const input = block.input

  switch (block.name) {
    case "fetch_recent_gmail": {
      const hours = Number(input.hours_back ?? 24)
      // Hard cap at 5. Each thread body adds context to subsequent Anthropic
      // calls; larger batches make every iteration slower.
      const limit = Math.min(5, Math.max(1, Number(input.limit ?? 5)))
      const query = String(input.query ?? "")
      const gmail = await getGmailClientForUser(userId)
      const days = Math.max(1, Math.ceil(hours / 24))
      const fullQuery = `${query} newer_than:${days}d`.trim()
      console.log(`[triage] fetch_recent_gmail: query="${fullQuery}", limit=${limit}`)
      const ids = await searchThreads(gmail, fullQuery)
      console.log(
        `[triage] fetch_recent_gmail: found ${ids.length} threads, taking top ${Math.min(limit, ids.length)}`,
      )
      const truncated = ids.slice(0, limit)

      // Fetch metadata + bodies in parallel — this is most of the wall-clock
      // savings. Without parallelism each thread is a sequential Gmail RPC.
      const results = await Promise.all(
        truncated.map(async (threadId) => {
          const [meta, messages] = await Promise.all([
            fetchThreadMeta(gmail, threadId),
            fetchThreadMessages(gmail, threadId),
          ])
          stats.threads_examined += 1
          // Concat bodies, lightly truncate to keep context manageable.
          const body = messages
            .map(
              (m) =>
                `--- ${m.fromName} <${m.fromEmail}> · ${m.date}\n${m.bodyText.slice(0, 4000)}`,
            )
            .join("\n\n")
          const latestMessage = messages[messages.length - 1]
          return {
            thread_id: threadId,
            subject: meta.subject,
            participants: meta.participants,
            last_message_date: meta.lastMessageDate,
            latest_message_id: latestMessage?.messageId ?? threadId,
            message_count: meta.messageCount,
            body_text: body.slice(0, 20_000), // hard cap to bound token usage
          }
        }),
      )
      return results
    }

    case "process_thread": {
      const args: ProcessThreadInput = {
        source_type: (input.source_type as "gmail" | "slack" | "attio" | "tacd_iq" | "manual") ?? "gmail",
        source_id: String(input.source_id ?? ""),
        thread_id: input.thread_id ? String(input.thread_id) : null,
        occurred_at: String(input.occurred_at ?? new Date().toISOString()),
        relevant: Boolean(input.relevant),
        reason: input.reason ? String(input.reason) : undefined,
        title: input.title ? String(input.title) : undefined,
        clean_summary: input.clean_summary ? String(input.clean_summary) : undefined,
        interaction_type: input.interaction_type as OigInteractionType | undefined,
        priority: input.priority as OigPriority | undefined,
        urgency: input.urgency as OigPriority | undefined,
        tags: Array.isArray(input.tags) ? (input.tags as string[]) : undefined,
        organization: input.organization
          ? {
              name: String((input.organization as Record<string, unknown>).name ?? ""),
              domain:
                (input.organization as Record<string, unknown>).domain !== undefined
                  ? String((input.organization as Record<string, unknown>).domain ?? "")
                  : null,
              org_type: ((input.organization as Record<string, unknown>).org_type ?? null) as
                | OigOrgType
                | null,
            }
          : undefined,
        primary_person: input.primary_person
          ? {
              full_name: String(
                (input.primary_person as Record<string, unknown>).full_name ?? "",
              ),
              email: (input.primary_person as Record<string, unknown>).email
                ? String((input.primary_person as Record<string, unknown>).email)
                : null,
              role: (input.primary_person as Record<string, unknown>).role
                ? String((input.primary_person as Record<string, unknown>).role)
                : null,
              relationship_type: (input.primary_person as Record<string, unknown>)
                .relationship_type
                ? String(
                    (input.primary_person as Record<string, unknown>).relationship_type,
                  )
                : null,
            }
          : undefined,
        action_items: Array.isArray(input.action_items)
          ? (input.action_items as Array<Record<string, unknown>>).map((a) => ({
              title: String(a.title ?? ""),
              description: a.description ? String(a.description) : null,
              due_date: a.due_date ? String(a.due_date) : null,
              priority: (a.priority as OigPriority | undefined) ?? null,
              category: a.category ? String(a.category) : null,
              confidence: typeof a.confidence === "number" ? a.confidence : null,
              owner_email: a.owner_email ? String(a.owner_email) : null,
              requested_by_email: a.requested_by_email
                ? String(a.requested_by_email)
                : null,
              tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
            }))
          : undefined,
      }
      const result = await processThread(args)
      if (result.relevant) {
        stats.threads_processed += 1
        if (result.interaction_created) stats.interactions_written += 1
        else stats.interactions_updated += 1
        stats.action_items_created += result.action_items_created
        stats.action_items_updated += result.action_items_updated
      } else {
        stats.threads_skipped += 1
      }
      return result
    }

    default:
      throw new Error(`Unknown tool: ${block.name}`)
  }
}
