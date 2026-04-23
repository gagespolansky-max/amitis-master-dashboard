import { createSSRSupabaseClient } from "@/lib/supabase-ssr"
import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

export type UserRole = "admin" | "teammate"

export async function requireUser() {
  const supabase = await createSSRSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Response("Unauthorized", { status: 401 })
  }
  return data.user
}

export async function getUser() {
  const supabase = await createSSRSupabaseClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()
  return (data?.role as UserRole) ?? "teammate"
}

export async function getUserWithRole() {
  const user = await getUser()
  if (!user) return { user: null, role: null as UserRole | null }
  const role = await getUserRole(user.id)
  return { user, role }
}
