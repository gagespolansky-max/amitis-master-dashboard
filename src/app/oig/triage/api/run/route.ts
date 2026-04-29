import { NextRequest, NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import { runTriage } from "../../_lib/run"

export const runtime = "nodejs"
export const maxDuration = 300 // Vercel Pro cap. Hobby caps at 60; Pro / Enterprise extend.

const AGENT_SLUG = "chief-of-staff"

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireAgentAccess(AGENT_SLUG)
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const hours_back = Number(body.hours_back ?? 24)
  if (!Number.isFinite(hours_back) || hours_back <= 0 || hours_back > 24 * 14) {
    return NextResponse.json(
      { error: "hours_back must be a positive number ≤ 336 (14 days)" },
      { status: 400 },
    )
  }
  const query = typeof body.query === "string" ? body.query : undefined
  const sources = Array.isArray(body.sources) ? (body.sources as string[]) : undefined
  const validSources = sources?.filter((s) =>
    ["gmail", "slack", "attio", "tacd_iq"].includes(s),
  ) as ("gmail" | "slack" | "attio" | "tacd_iq")[] | undefined

  try {
    const result = await runTriage(user.id, {
      hours_back,
      query,
      sources: validSources,
    })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
