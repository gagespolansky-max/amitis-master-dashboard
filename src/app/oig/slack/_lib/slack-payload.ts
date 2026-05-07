export interface SlackUrlVerificationPayload {
  type: "url_verification"
  challenge: string
}

export interface SlackAppMentionEvent {
  type: "app_mention"
  user: string
  text: string
  ts: string
  thread_ts?: string
  channel: string
  event_ts?: string
  bot_id?: string
  subtype?: string
}

export interface SlackEventCallbackPayload {
  type: "event_callback"
  team_id: string
  event_id: string
  event_time?: number
  event: SlackAppMentionEvent | { type?: string; [key: string]: unknown }
}

export function getUrlVerificationChallenge(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  if (payload.type !== "url_verification") return null
  return typeof payload.challenge === "string" ? payload.challenge : null
}

export function isSlackEventCallback(payload: unknown): payload is SlackEventCallbackPayload {
  if (!isRecord(payload)) return false
  return (
    payload.type === "event_callback" &&
    typeof payload.team_id === "string" &&
    typeof payload.event_id === "string" &&
    isRecord(payload.event)
  )
}

export function isSlackAppMentionEvent(event: unknown): event is SlackAppMentionEvent {
  if (!isRecord(event)) return false
  return (
    event.type === "app_mention" &&
    typeof event.user === "string" &&
    typeof event.text === "string" &&
    typeof event.ts === "string" &&
    typeof event.channel === "string"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
