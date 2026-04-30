import { NextResponse } from "next/server"
import { requireAgentAccess } from "@/lib/agent-auth"
import {
  listConversations,
  loadConversation,
} from "@/app/oig/_shared/persistence"
import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

const AGENT_SLUG = "chief-of-staff"

/**
 * GET /oig/cos/api/conversation              -> list user's COS conversations
 * GET /oig/cos/api/conversation?id=<uuid>    -> load full transcript
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
  const id = url.searchParams.get("id")

  if (id) {
    try {
      const convo = await loadConversation(id, user.id, AGENT_SLUG)
      return NextResponse.json(convo)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "load failed"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  const limit = Number(url.searchParams.get("limit") ?? 20)
  const list = await listConversations(user.id, AGENT_SLUG, limit)
  return NextResponse.json({ conversations: list })
}

/**
 * DELETE /oig/cos/api/conversation?id=<uuid>
 * Cascade deletes via FK on agent_messages.conversation_id.
 */
export async function DELETE(req: Request) {
  let user
  try {
    user = await requireAgentAccess(AGENT_SLUG)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const admin = createServiceRoleClient()
  const { error } = await admin
    .from("agent_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("agent_slug", AGENT_SLUG)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
