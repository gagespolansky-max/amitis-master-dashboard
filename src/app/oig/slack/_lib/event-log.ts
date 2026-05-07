import { createServerClient } from "@/lib/supabase-server"

export type SlackFundDocEventStatus =
  | "received"
  | "processing"
  | "answered"
  | "ignored"
  | "failed"

export interface RecordSlackFundDocEventInput {
  eventId: string
  teamId: string
  channelId: string
  userId: string
  messageTs: string
  threadTs: string
  retryNum?: number | null
  retryReason?: string | null
}

export async function recordSlackFundDocEvent(
  input: RecordSlackFundDocEventInput,
): Promise<"claimed" | "duplicate"> {
  const supabase = createServerClient()
  const { error } = await supabase.from("slack_fund_doc_events").insert({
    event_id: input.eventId,
    team_id: input.teamId,
    channel_id: input.channelId,
    user_id: input.userId,
    message_ts: input.messageTs,
    thread_ts: input.threadTs,
    status: "received",
    retry_num: input.retryNum ?? null,
    retry_reason: input.retryReason ?? null,
  })

  if (!error) return "claimed"
  if (error.code === "23505" || /duplicate key/i.test(error.message)) return "duplicate"

  throw new Error(`slack_fund_doc_events insert failed: ${error.message}`)
}

export async function updateSlackFundDocEvent(
  eventId: string,
  fields: {
    status: SlackFundDocEventStatus
    fundSlug?: string | null
    question?: string | null
    responseTs?: string | null
    error?: string | null
    processedAt?: string | null
  },
): Promise<void> {
  const supabase = createServerClient()
  const update: Record<string, string | null> = {
    status: fields.status,
  }

  if ("fundSlug" in fields) update.fund_slug = fields.fundSlug ?? null
  if ("question" in fields) update.question = fields.question ?? null
  if ("responseTs" in fields) update.response_ts = fields.responseTs ?? null
  if ("error" in fields) update.error = fields.error ?? null
  if ("processedAt" in fields) update.processed_at = fields.processedAt ?? null

  const { error } = await supabase
    .from("slack_fund_doc_events")
    .update(update)
    .eq("event_id", eventId)

  if (error) {
    throw new Error(`slack_fund_doc_events update failed: ${error.message}`)
  }
}
