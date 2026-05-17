import { NextRequest, NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import { authorizeCronRequest } from "@/lib/data-layer/attio-transcripts/cron-auth"
import { runAttioTranscriptIngest } from "@/lib/data-layer/attio-transcripts/ingest"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

const AGENT_SLUG = "chief-of-staff"

export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest(req.headers, process.env.CRON_SECRET)
  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const result = await runAttioTranscriptIngest({
      hoursBack: Number(process.env.ATTIO_TRANSCRIPT_HOURS_BACK ?? 72),
      maxMeetings: Number(process.env.ATTIO_TRANSCRIPT_MAX_MEETINGS ?? 50),
      maxRecordings: Number(process.env.ATTIO_TRANSCRIPT_MAX_RECORDINGS ?? 25),
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAgentAccess(AGENT_SLUG)
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  try {
    const result = await runAttioTranscriptIngest({
      hoursBack: Number(body.hours_back ?? 72),
      maxMeetings: Number(body.max_meetings ?? 25),
      maxRecordings: Number(body.max_recordings ?? 10),
      force: Boolean(body.force),
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
