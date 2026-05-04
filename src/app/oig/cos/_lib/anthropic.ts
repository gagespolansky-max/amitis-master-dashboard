import Anthropic from "@anthropic-ai/sdk"
import fs from "node:fs"
import path from "node:path"

export const anthropic = new Anthropic()

export const MODEL = "claude-sonnet-4-20250514"
export const MAX_TOKENS = 8192

// COS is conversational; allow longer multi-tool reasoning than Triage's tight loop.
export const MAX_LOOP_ITERATIONS = 18

// Load both canonical COS prompts from disk at module init. Edits to behavior
// happen in the .md files, not here.
const PROMPTS_DIR = path.join(process.cwd(), "src/app/oig/cos/_lib")
export const COS_SYSTEM_PROMPT_STRUCTURED = fs.readFileSync(
  path.join(PROMPTS_DIR, "cos-prompt.md"),
  "utf-8",
)
export const COS_SYSTEM_PROMPT_EPHEMERAL = fs.readFileSync(
  path.join(PROMPTS_DIR, "cos-prompt-ephemeral.md"),
  "utf-8",
)

// Back-compat for any caller that imported the old name.
export const COS_SYSTEM_PROMPT = COS_SYSTEM_PROMPT_STRUCTURED

export type CosMode = "structured" | "ephemeral"

// ----- Tool schemas (each defined once, composed into per-mode lists) -----

const READ_ACTION_ITEMS: Anthropic.Tool = {
  name: "read_action_items",
  description:
    "Read open or filtered action_items from the OIG database. Use this as the primary source of the operating TODO list. Default returns open/in_progress/blocked items ordered by due_date asc, priority desc. Use overdue_only=true for risk review. Filter by owner_email when surfacing what the user owes vs is owed. Returns denormalized rows with org_name, owner_name/email, source link.",
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "in_progress", "blocked", "done", "dropped", "open_or_in_progress", "all"],
        description: "Default 'open_or_in_progress' (open + in_progress + blocked).",
      },
      owner_email: {
        type: "string",
        description: "Case-insensitive exact match against the action item's owner email.",
      },
      priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
      due_before: {
        type: "string",
        description: "ISO date (YYYY-MM-DD). Returns items with due_date <= this date.",
      },
      overdue_only: {
        type: "boolean",
        description:
          "When true, only items with due_date < today AND status in (open, in_progress, blocked).",
      },
      limit: { type: "number", description: "1–200, default 50." },
    },
  },
}

const READ_INTERACTIONS: Anthropic.Tool = {
  name: "read_interactions",
  description:
    "Read recent or filtered interactions (emails, threads, meetings, transcripts) from the OIG database. Use for meeting prep (filter by org_name or person_email), recency review (days_back), or pulling threads with open commitments (has_open_action_items=true). Returns denormalized rows with org/person names, source link, and open_action_items_count.",
  input_schema: {
    type: "object",
    properties: {
      source_type: {
        type: "string",
        enum: ["gmail", "slack", "attio", "tacd_iq", "manual"],
      },
      org_name: {
        type: "string",
        description: "Case-insensitive substring match on the linked organization's name.",
      },
      person_email: {
        type: "string",
        description: "Case-insensitive exact match on the primary person's email.",
      },
      days_back: {
        type: "number",
        description: "Restrict to interactions with occurred_at within the last N days.",
      },
      has_open_action_items: {
        type: "boolean",
        description:
          "When true, only interactions that have at least one non-done/dropped action item.",
      },
      limit: { type: "number", description: "1–100, default 25." },
    },
  },
}

const READ_AUDIT_FINDINGS: Anthropic.Tool = {
  name: "read_audit_findings",
  description:
    "Read audit_findings from the OIG database — overdue items, stale follow-up, missing owners, unresolved commitments, repeated blockers, relationship risk. By default returns unresolved findings ordered by severity desc. Use this when the user asks about risk, drift, or what's slipping.",
  input_schema: {
    type: "object",
    properties: {
      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
      unresolved_only: {
        type: "boolean",
        description: "Default true. Set false to also see resolved findings.",
      },
      limit: { type: "number", description: "1–100, default 25." },
    },
  },
}

const FUND_DOC_SEARCH: Anthropic.Tool = {
  name: "fund_doc_search",
  description:
    "Search indexed fund documents with cited retrieval. Use this for fund-document factual questions about terms, strategy, operations, service providers, returns, DDQ/PPM/deck/IC/ODD content, or other fund diligence material. Returns an answer, citations, and retrieved chunks. Default excludes side letters and subscription agreements unless explicitly requested and available.",
  input_schema: {
    type: "object",
    properties: {
      fund_slug: {
        type: "string",
        description: "Fund slug to search, e.g. 'grandline'.",
      },
      question: {
        type: "string",
        description: "The factual fund-document question to answer.",
      },
      doc_types: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional doc_type filters such as ppm, ddq, deck, factsheet, ic_report, odd_report, audited_fs.",
      },
      exclude_doc_types: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional exclusions. Defaults to side_letter and sub_agreement in the underlying search layer.",
      },
      top_k: {
        type: "number",
        description: "Number of cited chunks to retrieve. 1-20; default 8.",
      },
      similarity_floor: {
        type: "number",
        description: "Minimum similarity for additional chunks. Default 0.5.",
      },
    },
    required: ["fund_slug", "question"],
  },
}

const GMAIL_SEARCH_RECENT: Anthropic.Tool = {
  name: "gmail_search_recent",
  description:
    "Scan the user's Gmail inbox over a recent window. Default window is the last 24h, excluding promotions/social/forums/updates/chat and noreply senders. Returns thread metadata (subject, snippet, participants, message count, body_preview). Use this as the primary email pass for the daily brief. The result set is time-bounded, not count-bounded — gather the minimum needed to build a good brief. Use gmail_get_thread to drill into specific threads that look operationally important; do NOT pull full bodies for everything. If the default returns nothing or looks thin, widen via hours_back or a directed query (e.g., 'from:<sender>', 'is:unread', 'subject:<term>').",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Optional Gmail search filter appended to the default. Examples: 'from:investor', 'is:unread', 'subject:Q4', '-is:important' (override default to widen). Leave empty for default Primary+Important scan.",
      },
      hours_back: {
        type: "number",
        description:
          "1–336 (14 days). Default 24. The standard daily brief window is 24h.",
      },
      max_threads: {
        type: "number",
        description:
          "Safety ceiling, 1–75. Default 50. Use the time window, not this cap, to control coverage.",
      },
    },
  },
}

const GMAIL_GET_THREAD: Anthropic.Tool = {
  name: "gmail_get_thread",
  description:
    "Drill into one specific Gmail thread — verification, meeting prep, or pulling exact wording before drafting a reply. Returns each message in the thread with from, date, subject, body (truncated). In structured mode, do NOT use this to build the main brief; the OIG layer is the primary source. In ephemeral mode, use sparingly — only on threads that look operationally important.",
  input_schema: {
    type: "object",
    properties: {
      thread_id: {
        type: "string",
        description: "Gmail thread id (from interactions.thread_id or gmail_search_recent).",
      },
      max_chars_per_message: {
        type: "number",
        description: "Cap body length per message. 200–5000, default 1500.",
      },
    },
    required: ["thread_id"],
  },
}

const CREATE_GMAIL_DRAFT: Anthropic.Tool = {
  name: "create_gmail_draft",
  description:
    "Create a Gmail DRAFT (never sends). Use ONLY when the user explicitly asks for follow-through. To draft a reply, pass thread_id + in_reply_to_message_id from a previous gmail_get_thread call so it threads correctly. For new outreach, omit those. Recipient must be a real address, not a guess — confirm with the user if uncertain.",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address." },
      cc: { type: "string" },
      bcc: { type: "string" },
      subject: { type: "string" },
      body: { type: "string", description: "Plain text body." },
      thread_id: {
        type: "string",
        description: "Gmail thread id when drafting a reply. Omit for new outreach.",
      },
      in_reply_to_message_id: {
        type: "string",
        description:
          "Gmail message id of the message being replied to. Used to set RFC 822 In-Reply-To/References so Gmail threads it correctly. Omit for new outreach.",
      },
    },
    required: ["to", "subject", "body"],
  },
}

const LIST_CALENDAR_EVENTS: Anthropic.Tool = {
  name: "list_calendar_events",
  description:
    "List Google Calendar events for the user (read-only). Use this to anchor the daily brief, sequence priorities, and prep for upcoming meetings. Default window is today; pass days_forward for a wider window or explicit time_min/time_max for custom ranges. Returns each event's title, start/end, attendees with response status, location, and meet link.",
  input_schema: {
    type: "object",
    properties: {
      time_min: {
        type: "string",
        description: "ISO datetime lower bound. Defaults to start of today (local).",
      },
      time_max: {
        type: "string",
        description: "ISO datetime upper bound. Defaults to start of today + days_forward.",
      },
      days_forward: {
        type: "number",
        description:
          "Convenience window when time_max is omitted. 1=today only, 7=upcoming week. 1–60, default 1.",
      },
      query: {
        type: "string",
        description: "Free-text Google Calendar search (q parameter).",
      },
      max_results: { type: "number", description: "1–100, default 25." },
      calendar_id: { type: "string", description: "Calendar id; default 'primary'." },
    },
  },
}

const READ_BRIEFING_PREFERENCES: Anthropic.Tool = {
  name: "read_briefing_preferences",
  description:
    "Read durable briefing preferences for the user (preferred brief shape, default time window, delivery preference, etc.). Returns the markdown contents or empty string if unset.",
  input_schema: { type: "object", properties: {} },
}

const WRITE_BRIEFING_PREFERENCES: Anthropic.Tool = {
  name: "write_briefing_preferences",
  description:
    "Persist durable briefing preferences as markdown. Use ONLY for stable preferences the user explicitly states ('always include calendar', 'lead with overdue', 'deliver to Slack'). Do NOT use for transient session state, one-off context, or fact memos. Overwrites the previous content.",
  input_schema: {
    type: "object",
    properties: {
      content: { type: "string", description: "Full markdown content to store." },
    },
    required: ["content"],
  },
}

// ----- Per-mode tool lists -----

export const COS_TOOLS_STRUCTURED: Anthropic.Tool[] = [
  READ_ACTION_ITEMS,
  READ_INTERACTIONS,
  READ_AUDIT_FINDINGS,
  FUND_DOC_SEARCH,
  GMAIL_GET_THREAD,
  CREATE_GMAIL_DRAFT,
  LIST_CALENDAR_EVENTS,
  READ_BRIEFING_PREFERENCES,
  WRITE_BRIEFING_PREFERENCES,
]

export const COS_TOOLS_EPHEMERAL: Anthropic.Tool[] = [
  LIST_CALENDAR_EVENTS,
  FUND_DOC_SEARCH,
  GMAIL_SEARCH_RECENT,
  GMAIL_GET_THREAD,
  CREATE_GMAIL_DRAFT,
  READ_BRIEFING_PREFERENCES,
  WRITE_BRIEFING_PREFERENCES,
]

// Back-compat for any caller that imported the old name.
export const COS_TOOLS = COS_TOOLS_STRUCTURED

export interface CosModeConfig {
  systemPrompt: string
  tools: Anthropic.Tool[]
}

export function getCosConfig(mode: CosMode): CosModeConfig {
  if (mode === "ephemeral") {
    return {
      systemPrompt: COS_SYSTEM_PROMPT_EPHEMERAL,
      tools: COS_TOOLS_EPHEMERAL,
    }
  }
  return {
    systemPrompt: COS_SYSTEM_PROMPT_STRUCTURED,
    tools: COS_TOOLS_STRUCTURED,
  }
}
