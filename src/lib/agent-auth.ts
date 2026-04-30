import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"

/**
 * Check whether a user has access to a given agent.
 * Returns true if the user has an enabled row in agent_permissions for that slug.
 */
export async function userHasAgentAccess(userId: string, agentSlug: string): Promise<boolean> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("agent_permissions")
    .select("enabled")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .maybeSingle()
  return Boolean(data?.enabled)
}

/**
 * Require that the current request is from an authenticated user with access to the named agent.
 * Use in API routes — throws a Response that the route can rethrow.
 */
export async function requireAgentAccess(agentSlug: string) {
  const user = await requireUser()
  const ok = await userHasAgentAccess(user.id, agentSlug)
  if (!ok) {
    throw new Response("Forbidden: no access to this agent", { status: 403 })
  }
  return user
}
