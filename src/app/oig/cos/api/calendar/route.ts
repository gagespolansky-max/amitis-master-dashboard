import { NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import { toolListCalendarEvents } from "@/app/oig/cos/_lib/cos-tools"

export const runtime = "nodejs"

const AGENT_SLUG = "chief-of-staff"

/**
 * GET /oig/cos/api/calendar?days_back=1&days_forward=3
 *
 * Wraps the COS list_calendar_events tool for the calendar panel UI.
 * Returns the same payload, plus a `needs_reauth` flag if the user's
 * Google refresh token doesn't have the calendar.readonly scope yet.
 */
export async function GET(req: Request) {
  let user
  try {
    user = await requireAgentAccess(AGENT_SLUG)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const url = new URL(req.url)
  const explicitMin = url.searchParams.get("time_min")
  const explicitMax = url.searchParams.get("time_max")

  let timeMin: string | undefined
  let timeMax: string | undefined
  if (explicitMin && explicitMax) {
    timeMin = explicitMin
    timeMax = explicitMax
  } else {
    const daysBack = clamp(Number(url.searchParams.get("days_back") ?? 1), 0, 7)
    const daysForward = clamp(Number(url.searchParams.get("days_forward") ?? 3), 1, 30)
    const now = new Date()
    const startBack = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 0, 0, 0, 0)
    timeMin = startBack.toISOString()
    timeMax = new Date(startBack.getTime() + (daysBack + daysForward) * 86_400_000).toISOString()
  }

  try {
    const result = await toolListCalendarEvents(user.id, {
      time_min: timeMin,
      time_max: timeMax,
      max_results: 250,
    })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "calendar load failed"
    const lower = msg.toLowerCase()
    if (
      lower.includes("insufficient") ||
      lower.includes("calendar.readonly") ||
      lower.includes("invalid_grant") ||
      lower.includes("scope") ||
      lower.includes("403") ||
      lower.includes("permission")
    ) {
      return NextResponse.json(
        { needs_reauth: true, error: msg, events: [], count: 0 },
        { status: 200 },
      )
    }
    if (lower.includes("no google credentials") || lower.includes("no gmail credentials")) {
      return NextResponse.json(
        { needs_reauth: true, error: msg, events: [], count: 0 },
        { status: 200 },
      )
    }
    return NextResponse.json({ error: msg, events: [], count: 0 }, { status: 500 })
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}
