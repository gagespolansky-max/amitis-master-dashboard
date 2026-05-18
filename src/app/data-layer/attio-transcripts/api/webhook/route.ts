import { after, NextRequest, NextResponse } from "next/server"
import { runAttioTranscriptIngestForRecording } from "@/lib/data-layer/attio-transcripts/ingest"
import { authorizeAttioWebhookRequest } from "@/lib/data-layer/attio-transcripts/webhook-auth"
import { parseAttioCallRecordingCreatedEvents } from "@/lib/data-layer/attio-transcripts/webhook-events"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const auth = authorizeAttioWebhookRequest({
    rawBody,
    headers: req.headers,
    webhookSecret: process.env.ATTIO_TRANSCRIPT_WEBHOOK_SECRET,
  })
  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody) as unknown
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const events = parseAttioCallRecordingCreatedEvents(payload)

  if (events.length > 0) {
    after(async () => {
      for (const event of events) {
        const result = await runAttioTranscriptIngestForRecording({
          meetingId: event.id.meeting_id,
          callRecordingId: event.id.call_recording_id,
        })
        if (result.transcripts_errored > 0) {
          console.error("[attio-transcripts] webhook ingest failed", {
            meetingId: event.id.meeting_id,
            callRecordingId: event.id.call_recording_id,
            errors: result.errors,
          })
        }
      }
    })
  }

  return NextResponse.json({
    received: true,
    events_accepted: events.length,
  }, { status: 202 })
}
