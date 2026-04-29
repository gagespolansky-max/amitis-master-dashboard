import { requireUser, getUserRole, type UserRole } from "@/lib/auth"

export const OIG_AGENT_SLUG = "chief-of-staff"

const AGENT_ACCESS: Record<string, UserRole[]> = {
  [OIG_AGENT_SLUG]: ["admin", "teammate"],
}

export async function userHasAgentAccess(userId: string, agentSlug: string): Promise<boolean> {
  const allowedRoles = AGENT_ACCESS[agentSlug] ?? ["admin"]
  const role = await getUserRole(userId)
  return allowedRoles.includes(role)
}

export async function requireAgentAccess(agentSlug: string) {
  const user = await requireUser()
  if (!(await userHasAgentAccess(user.id, agentSlug))) {
    throw new Response("Forbidden", { status: 403 })
  }
  return user
}
