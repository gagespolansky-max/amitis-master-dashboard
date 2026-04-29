import type { User } from "@supabase/supabase-js"
import { getUser, getUserRole } from "@/lib/auth"

/**
 * Per-agent access gate used by OIG (Triage + Chief of Staff).
 *
 * The launch posture is admin-only: any user with `role = 'admin'` in
 * `user_roles` can use every OIG agent. We keep the agent slug parameter so
 * the call sites already match a per-agent grant model — when a future
 * `agent_access` table is introduced, only this file changes.
 *
 * Slugs in current use: `chief-of-staff`, `triage` (reserved).
 */
export type AgentSlug = "chief-of-staff" | "triage"

export async function userHasAgentAccess(
  userId: string,
  agentSlug: AgentSlug | string,
): Promise<boolean> {
  // Slug is accepted today so call sites already use the per-agent shape.
  // The launch posture is admin-only across every OIG agent.
  void agentSlug
  if (!userId) return false
  const role = await getUserRole(userId)
  return role === "admin"
}

/**
 * Throws a `Response` (Next will return it as-is from API routes) when the
 * caller is not signed in or does not have access to the agent. Returns the
 * authenticated user otherwise.
 */
export async function requireAgentAccess(
  agentSlug: AgentSlug | string,
): Promise<User> {
  const user = await getUser()
  if (!user) {
    throw new Response("Unauthorized", { status: 401 })
  }
  const ok = await userHasAgentAccess(user.id, agentSlug)
  if (!ok) {
    throw new Response("Forbidden", { status: 403 })
  }
  return user
}
