import { NextRequest, NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import {
  listTranscriptReviewQueue,
  markTranscriptReviewed,
} from "@/lib/data-layer/attio-transcripts/memory"
import type { TranscriptStatus } from "@/lib/data-layer/attio-transcripts/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AGENT_SLUG = "chief-of-staff"

const REVIEW_STATUSES = new Set<TranscriptStatus>([
  "ready_for_review",
  "needs_human_review",
  "reviewed",
  "ignored",
])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseStatuses(value: string | null): TranscriptStatus[] {
  if (!value) return ["ready_for_review", "needs_human_review"]
  const statuses = value
    .split(",")
    .map((status) => status.trim())
    .filter((status): status is TranscriptStatus => REVIEW_STATUSES.has(status as TranscriptStatus))
  return statuses.length > 0 ? statuses : ["ready_for_review", "needs_human_review"]
}

export async function GET(req: NextRequest) {
  try {
    await requireAgentAccess(AGENT_SLUG)
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  try {
    const transcripts = await listTranscriptReviewQueue({
      statuses: parseStatuses(params.get("status")),
      limit: Number(params.get("limit") ?? 25),
    })
    return NextResponse.json({ transcripts })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAgentAccess>>
  try {
    user = await requireAgentAccess(AGENT_SLUG)
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const transcriptId = typeof body.transcript_id === "string" ? body.transcript_id : ""
  const action = body.action === "ignore" ? "ignored" : body.action === "approve" ? "reviewed" : null

  if (!UUID_RE.test(transcriptId) || !action) {
    return NextResponse.json({ error: "transcript_id and action are required" }, { status: 400 })
  }

  try {
    await markTranscriptReviewed({
      transcriptId,
      status: action,
      reviewedBy: user.email ?? user.id,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
