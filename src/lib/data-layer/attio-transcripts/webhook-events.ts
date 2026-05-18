export type AttioCallRecordingCreatedEvent = {
  event_type: "call-recording.created"
  id: {
    workspace_id?: string
    meeting_id: string
    call_recording_id: string
  }
  actor?: unknown
}

export type AttioWebhookPayload = {
  webhook_id?: string
  events?: unknown[]
}

export function parseAttioCallRecordingCreatedEvents(
  payload: unknown,
): AttioCallRecordingCreatedEvent[] {
  if (!payload || typeof payload !== "object") return []
  const events = (payload as AttioWebhookPayload).events
  if (!Array.isArray(events)) return []

  return events.filter(isCallRecordingCreatedEvent)
}

function isCallRecordingCreatedEvent(value: unknown): value is AttioCallRecordingCreatedEvent {
  if (!value || typeof value !== "object") return false
  const event = value as Partial<AttioCallRecordingCreatedEvent>
  return (
    event.event_type === "call-recording.created" &&
    typeof event.id?.meeting_id === "string" &&
    typeof event.id.call_recording_id === "string"
  )
}
