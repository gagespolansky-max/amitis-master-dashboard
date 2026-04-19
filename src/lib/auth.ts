import { createSSRSupabaseClient } from "@/lib/supabase-ssr"

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
