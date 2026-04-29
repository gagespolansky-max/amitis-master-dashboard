import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"
import {
  getGmailClientForUser,
  fetchThreadMessages,
  fetchThreadMeta,
  searchThreads,
  type GmailClient,
} from "@/app/acio/deals/_lib/gmail"
import { getCalendarClientForUser } from "@/app/oig/_shared/calendar"
import {
  readActionItems,
  readInteractions,
  readAuditFindings,
  type ActionItemRead,
  type InteractionRead,
  type AuditFindingRead,
  type OigPriority,
  type OigActionStatus,
  type OigSourceType,
} from "@/app/oig/_shared/db"

// ============================================================================
// COS tool implementations.
//
// COS is a READER. The only write tools here are:
//   - create_gmail_draft (drafts, never sends)
//   - write_briefing_preferences (durable user preferences only)
// ============================================================================

const AGENT_SLUG = "chief-of-staff"

// ---------------------------------------------------------------------------
// OIG DB readers
// ---------------------------------------------------------------------------

export interface ReadActionItemsArgs {
  status?: OigActionStatus | "open_or_in_progress" | "all"
  owner_email?: string
  priority?: OigPriority
  due_before?: string
  overdue_only?: boolean
  limit?: number
}

export async function toolReadActionItems(args: ReadActionItemsArgs): Promise<{
  count: number
  items: ActionItemRead[]
}> {
  const items = await readActionItems(args)
  return { count: items.length, items }
}

export interface ReadInteractionsArgs {
  source_type?: OigSourceType
  org_name?: string
  person_email?: string
  days_back?: number
  has_open_action_items?: boolean
  limit?: number
}

export async function toolReadInteractions(args: ReadInteractionsArgs): Promise<{
  count: number
  interactions: InteractionRead[]
}> {
  const interactions = await readInteractions(args)
  return { count: interactions.length, interactions }
}

export interface ReadAuditFindingsArgs {
  severity?: "low" | "medium" | "high" | "critical"
  unresolved_only?: boolean
  limit?: number
}

export async function toolReadAuditFindings(args: ReadAuditFindingsArgs): Promise<{
  count: number
  findings: AuditFindingRead[]
}> {
  const findings = await readAuditFindings(args)
  return { count: findings.length, findings }
}

// ---------------------------------------------------------------------------
// Gmail drill-down (read one specific thread for verification / meeting prep)
// ---------------------------------------------------------------------------

export interface GmailGetThreadArgs {
  thread_id: string
  max_chars_per_message?: number
}

export async function toolGmailGetThread(
  userId: string,
  args: GmailGetThreadArgs,
): Promise<{
  thread_id: string
  message_count: number
  messages: Array<{
    from: string
    date: string
    subject: string
    body: string
    snippet: string
  }>
}> {
  const gmail = await getGmailClientForUser(userId)
  const messages = await fetchThreadMessages(gmail, args.thread_id)
  const cap = Math.max(200, Math.min(5000, args.max_chars_per_message ?? 1500))

  return {
    thread_id: args.thread_id,
    message_count: messages.length,
    messages: messages.map((m) => ({
      from: m.fromName ? `${m.fromName} <${m.fromEmail}>` : m.fromEmail,
      date: m.date,
      subject: m.subject,
      body: m.bodyText.slice(0, cap),
      snippet: m.snippet,
    })),
  }
}

// ---------------------------------------------------------------------------
// Gmail draft creation (only write tool against Gmail; never sends)
// ---------------------------------------------------------------------------

export interface CreateGmailDraftArgs {
  to: string
  cc?: string | null
  bcc?: string | null
  subject: string
  body: string
  thread_id?: string | null
  in_reply_to_message_id?: string | null
}

export async function toolCreateGmailDraft(
  userId: string,
  args: CreateGmailDraftArgs,
): Promise<{ draft_id: string; message_id: string; thread_id: string | null }> {
  const gmail = await getGmailClientForUser(userId)

  // Resolve in-reply-to header from a Gmail message id when threading a reply.
  const inReplyToHeader = args.in_reply_to_message_id
    ? await fetchRfc822MessageId(gmail, args.in_reply_to_message_id)
    : null

  const raw = buildRfc822({
    to: args.to,
    cc: args.cc ?? null,
    bcc: args.bcc ?? null,
    subject: args.subject,
    body: args.body,
    inReplyTo: inReplyToHeader,
  })

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw,
        ...(args.thread_id ? { threadId: args.thread_id } : {}),
      },
    },
  })

  return {
    draft_id: res.data.id || "",
    message_id: res.data.message?.id || "",
    thread_id: res.data.message?.threadId || null,
  }
}

async function fetchRfc822MessageId(
  gmail: GmailClient,
  gmailMessageId: string,
): Promise<string | null> {
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: gmailMessageId,
    format: "metadata",
    metadataHeaders: ["Message-ID", "Message-Id"],
  })
  const headers = msg.data.payload?.headers ?? []
  const id = headers.find((h) => /^message-id$/i.test(h.name || ""))?.value
  return id ?? null
}

function buildRfc822(args: {
  to: string
  cc: string | null
  bcc: string | null
  subject: string
  body: string
  inReplyTo: string | null
}): string {
  const lines: string[] = []
  lines.push(`To: ${args.to}`)
  if (args.cc) lines.push(`Cc: ${args.cc}`)
  if (args.bcc) lines.push(`Bcc: ${args.bcc}`)
  lines.push(`Subject: ${args.subject}`)
  lines.push("MIME-Version: 1.0")
  lines.push("Content-Type: text/plain; charset=UTF-8")
  if (args.inReplyTo) {
    lines.push(`In-Reply-To: ${args.inReplyTo}`)
    lines.push(`References: ${args.inReplyTo}`)
  }
  lines.push("")
  lines.push(args.body)
  return Buffer.from(lines.join("\r\n"), "utf-8").toString("base64url")
}

// ---------------------------------------------------------------------------
// Gmail search (ephemeral mode — direct inbox scan, no DB writes)
// ---------------------------------------------------------------------------

export interface GmailSearchRecentArgs {
  query?: string
  hours_back?: number
  max_threads?: number
}

export async function toolGmailSearchRecent(
  userId: string,
  args: GmailSearchRecentArgs,
): Promise<{
  count: number
  query: string
  threads: Array<{
    thread_id: string
    subject: string
    snippet: string
    last_message_date: string
    participants: Array<{ name: string; email: string }>
    message_count: number
    body_preview: string
  }>
}> {
  const gmail = await getGmailClientForUser(userId)
  const hours = Math.max(1, Math.min(336, args.hours_back ?? 24))
  // Time-bounded, not count-bounded. The cap is a safety ceiling, not a target.
  const maxThreads = Math.max(1, Math.min(75, args.max_threads ?? 50))

  const newerClause = hours <= 24 ? `newer_than:${hours}h` : `newer_than:${Math.ceil(hours / 24)}d`
  // Default to Gmail's Primary category — same set the user sees in their
  // Primary tab. Excludes promotions/social/forums/updates without depending
  // on Gmail having explicitly marked threads as Important (most inboxes
  // haven't curated that signal).
  const baseFilters = "category:primary -in:chat"
  const userQuery = args.query?.trim() ? args.query.trim() : ""
  const query = `${newerClause} ${baseFilters}${userQuery ? ` ${userQuery}` : ""}`.trim()

  const threadIds = await searchThreads(gmail, query)
  const top = threadIds.slice(0, maxThreads)

  // Fetch metadata for each thread in parallel.
  const metas = await Promise.all(top.map((id) => fetchThreadMeta(gmail, id)))

  return {
    count: metas.length,
    query,
    threads: metas.map((m) => ({
      thread_id: m.threadId,
      subject: m.subject,
      snippet: m.snippet,
      last_message_date: m.lastMessageDate,
      participants: m.participants,
      message_count: m.messageCount,
      body_preview: m.bodyPreview.slice(0, 1500),
    })),
  }
}

// ---------------------------------------------------------------------------
// Calendar (read-only)
// ---------------------------------------------------------------------------

export interface ListCalendarEventsArgs {
  time_min?: string // ISO datetime; default = start of today (local)
  time_max?: string // ISO datetime; default = end of today (local)
  days_forward?: number // alt to time_max; e.g., 1 = today only, 7 = next week
  query?: string // free-text Google Calendar search
  max_results?: number
  calendar_id?: string // default 'primary'
}

export async function toolListCalendarEvents(
  userId: string,
  args: ListCalendarEventsArgs,
): Promise<{
  count: number
  time_min: string
  time_max: string
  events: Array<{
    id: string | null
    summary: string
    description: string | null
    start: string | null
    end: string | null
    all_day: boolean
    location: string | null
    organizer_email: string | null
    attendees: Array<{ email: string; name: string | null; response_status: string | null }>
    hangout_link: string | null
    html_link: string | null
    status: string | null
  }>
}> {
  const calendar = await getCalendarClientForUser(userId)

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const days = Math.max(1, Math.min(60, args.days_forward ?? 1))
  const defaultMax = new Date(startOfToday.getTime() + days * 86_400_000)

  const timeMin = args.time_min ?? startOfToday.toISOString()
  const timeMax = args.time_max ?? defaultMax.toISOString()
  const maxResults = Math.max(1, Math.min(100, args.max_results ?? 25))

  const res = await calendar.events.list({
    calendarId: args.calendar_id ?? "primary",
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
    q: args.query,
  })

  const items = res.data.items ?? []
  return {
    count: items.length,
    time_min: timeMin,
    time_max: timeMax,
    events: items.map((e) => {
      const start = e.start?.dateTime ?? e.start?.date ?? null
      const end = e.end?.dateTime ?? e.end?.date ?? null
      const allDay = !e.start?.dateTime && !!e.start?.date
      return {
        id: e.id ?? null,
        summary: e.summary ?? "(no title)",
        description: e.description ?? null,
        start,
        end,
        all_day: allDay,
        location: e.location ?? null,
        organizer_email: e.organizer?.email ?? null,
        attendees: (e.attendees ?? []).map((a) => ({
          email: a.email ?? "",
          name: a.displayName ?? null,
          response_status: a.responseStatus ?? null,
        })),
        hangout_link: e.hangoutLink ?? null,
        html_link: e.htmlLink ?? null,
        status: e.status ?? null,
      }
    }),
  }
}

// ---------------------------------------------------------------------------
// Briefing preferences (durable, lightweight)
// ---------------------------------------------------------------------------
//
// Stored in `agent_memory` under (user_id, agent_slug='chief-of-staff', filename).
// Use ONLY for durable user preferences — preferred brief shape, default time
// window, delivery destination. Never for transient state or one-off context.

const BRIEFING_PREFS_FILENAME = "briefing-preferences.md"

export async function toolReadBriefingPreferences(
  userId: string,
): Promise<{ exists: boolean; content: string }> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("agent_memory")
    .select("content")
    .eq("user_id", userId)
    .eq("agent_slug", AGENT_SLUG)
    .eq("filename", BRIEFING_PREFS_FILENAME)
    .maybeSingle()
  if (error) throw new Error(`readBriefingPreferences: ${error.message}`)
  return { exists: !!data, content: data?.content ?? "" }
}

export async function toolWriteBriefingPreferences(
  userId: string,
  args: { content: string },
): Promise<{ ok: true; bytes: number }> {
  const admin = createServiceRoleClient()
  const { error } = await admin.from("agent_memory").upsert(
    {
      user_id: userId,
      agent_slug: AGENT_SLUG,
      filename: BRIEFING_PREFS_FILENAME,
      content: args.content,
    },
    { onConflict: "user_id,agent_slug,filename" },
  )
  if (error) throw new Error(`writeBriefingPreferences: ${error.message}`)
  return { ok: true, bytes: args.content.length }
}

// ---------------------------------------------------------------------------
// Tool dispatcher
// ---------------------------------------------------------------------------

export type CosToolName =
  | "read_action_items"
  | "read_interactions"
  | "read_audit_findings"
  | "gmail_get_thread"
  | "gmail_search_recent"
  | "create_gmail_draft"
  | "list_calendar_events"
  | "read_briefing_preferences"
  | "write_briefing_preferences"

export interface CosToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export async function executeCosTool(
  userId: string,
  call: CosToolCall,
): Promise<unknown> {
  switch (call.name as CosToolName) {
    case "read_action_items":
      return toolReadActionItems(call.input as ReadActionItemsArgs)
    case "read_interactions":
      return toolReadInteractions(call.input as ReadInteractionsArgs)
    case "read_audit_findings":
      return toolReadAuditFindings(call.input as ReadAuditFindingsArgs)
    case "gmail_get_thread":
      return toolGmailGetThread(userId, call.input as unknown as GmailGetThreadArgs)
    case "gmail_search_recent":
      return toolGmailSearchRecent(userId, call.input as GmailSearchRecentArgs)
    case "create_gmail_draft":
      return toolCreateGmailDraft(userId, call.input as unknown as CreateGmailDraftArgs)
    case "list_calendar_events":
      return toolListCalendarEvents(userId, call.input as ListCalendarEventsArgs)
    case "read_briefing_preferences":
      return toolReadBriefingPreferences(userId)
    case "write_briefing_preferences":
      return toolWriteBriefingPreferences(userId, call.input as { content: string })
    default:
      throw new Error(`Unknown COS tool: ${call.name}`)
  }
}
