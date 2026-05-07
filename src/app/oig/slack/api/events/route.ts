import { after, NextResponse } from "next/server"
import { recordSlackFundDocEvent } from "@/app/oig/slack/_lib/event-log"
import { processSlackFundDocMention } from "@/app/oig/slack/_lib/runtime"
import {
  getUrlVerificationChallenge,
  isSlackAppMentionEvent,
  isSlackEventCallback,
} from "@/app/oig/slack/_lib/slack-payload"
import { verifySlackSignature } from "@/app/oig/slack/_lib/slack-signature"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(req: Request) {
  const body = await req.text()
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    return NextResponse.json({ error: "SLACK_SIGNING_SECRET is not configured" }, { status: 500 })
  }

  const validSignature = verifySlackSignature({
    signingSecret,
    timestamp: req.headers.get("x-slack-request-timestamp") ?? "",
    signature: req.headers.get("x-slack-signature"),
    body,
  })
  if (!validSignature) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const challenge = getUrlVerificationChallenge(payload)
  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  if (!isSlackEventCallback(payload)) {
    return NextResponse.json({ ok: true, ignored: "unsupported_payload" })
  }

  const configuredTeamId = process.env.SLACK_TEAM_ID
  if (!configuredTeamId) {
    return NextResponse.json({ error: "SLACK_TEAM_ID is not configured" }, { status: 500 })
  }

  if (payload.team_id !== configuredTeamId) {
    return NextResponse.json({ ok: true, ignored: "wrong_team" })
  }

  if (!isSlackAppMentionEvent(payload.event)) {
    return NextResponse.json({ ok: true, ignored: "unsupported_event" })
  }

  if (payload.event.bot_id || payload.event.subtype === "bot_message") {
    return NextResponse.json({ ok: true, ignored: "bot_event" })
  }

  const threadTs = payload.event.thread_ts ?? payload.event.ts
  const retryNumHeader = req.headers.get("x-slack-retry-num")
  const retryNum = retryNumHeader ? Number(retryNumHeader) : null

  const claim = await recordSlackFundDocEvent({
    eventId: payload.event_id,
    teamId: payload.team_id,
    channelId: payload.event.channel,
    userId: payload.event.user,
    messageTs: payload.event.ts,
    threadTs,
    retryNum: Number.isFinite(retryNum) ? retryNum : null,
    retryReason: req.headers.get("x-slack-retry-reason"),
  })

  if (claim === "duplicate") {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const event = payload.event
  const eventId = payload.event_id
  after(async () => {
    await processSlackFundDocMention({ eventId, event })
  })

  return NextResponse.json({ ok: true })
}
