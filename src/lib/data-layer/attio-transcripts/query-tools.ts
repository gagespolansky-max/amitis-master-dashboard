import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"

export async function searchTranscripts(args: {
  query: string
  labels?: string[]
  status?: string
  reviewedOnly?: boolean
  limit?: number
}) {
  const admin = createServiceRoleClient()
  const limit = Math.min(50, Math.max(1, args.limit ?? 10))
  let q = admin
    .from("call_transcripts")
    .select("id, call_date, title, summary, labels, status, source_url")
    .limit(limit)
    .order("call_date", { ascending: false })

  if (args.status) q = q.eq("status", args.status)
  else if (args.reviewedOnly ?? true) q = q.eq("status", "reviewed")
  if (args.labels?.length) q = q.contains("labels", args.labels)
  if (args.query.trim()) {
    const term = `%${args.query.trim()}%`
    q = q.or(`title.ilike.${term},raw_transcript.ilike.${term}`)
  }

  const { data, error } = await q
  if (error) throw new Error(`searchTranscripts: ${error.message}`)
  return data ?? []
}

export async function getCounterpartyProfile(counterparty: string) {
  const admin = createServiceRoleClient()
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  let q = admin
    .from("counterparty_profiles")
    .select("id, name, domain, last_call_at")
    .limit(1)
  q = uuidLike.test(counterparty) ? q.eq("id", counterparty) : q.ilike("name", `%${counterparty}%`)
  const { data, error } = await q.maybeSingle()
  if (error) throw new Error(`getCounterpartyProfile: ${error.message}`)
  if (!data) return null
  return {
    ...data,
    profile_summary: null,
    relationship_status: null,
    current_needs: [],
    preferences: [],
    risks: [],
    source_observation_count: null,
    review_policy: "Profile synthesis is withheld until reviewed-only synthesis is available.",
  }
}

export async function listRecentCalls(counterparty: string, limit = 10) {
  const admin = createServiceRoleClient()
  const profile = await getCounterpartyProfile(counterparty)
  if (!profile) return []
  const { data, error } = await admin
    .from("counterparty_observations")
    .select("call:call_transcripts!counterparty_observations_call_transcript_id_fkey!inner(id, call_date, title, summary, labels, source_url, status)")
    .eq("counterparty_profile_id", profile.id)
    .eq("call.status", "reviewed")
    .order("observation_date", { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)))
  if (error) throw new Error(`listRecentCalls: ${error.message}`)
  const seen = new Set<string>()
  return (data ?? []).map((row) => row.call).filter((call) => {
    const id = (call as { id?: string } | null)?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export async function getCallSummary(callId: string) {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("call_transcripts")
    .select("id, call_date, title, summary, classification, labels, status, source_url, participants:call_participants(display_name, email, firm_name, inferred_role)")
    .eq("id", callId)
    .maybeSingle()
  if (error) throw new Error(`getCallSummary: ${error.message}`)
  return data
}

export async function findCounterpartyObservations(counterparty: string, topic?: string) {
  const admin = createServiceRoleClient()
  const profile = await getCounterpartyProfile(counterparty)
  if (!profile) return []
  let q = admin
    .from("counterparty_observations")
    .select("id, observation_date, topic, observation_type, claim, evidence, speaker_name, confidence, call:call_transcripts!counterparty_observations_call_transcript_id_fkey!inner(id, title, source_url, status)")
    .eq("counterparty_profile_id", profile.id)
    .eq("call.status", "reviewed")
    .order("observation_date", { ascending: false })
    .limit(100)
  if (topic) q = q.ilike("topic", `%${topic}%`)
  const { data, error } = await q
  if (error) throw new Error(`findCounterpartyObservations: ${error.message}`)
  return data ?? []
}

export async function prepareCallBrief(counterparty: string) {
  const [profile, recentCalls, observations] = await Promise.all([
    getCounterpartyProfile(counterparty),
    listRecentCalls(counterparty, 5),
    findCounterpartyObservations(counterparty),
  ])
  return {
    profile,
    recent_calls: recentCalls,
    source_observations: observations.slice(0, 25),
    review_required: observations.length === 0,
    review_policy: "Only observations from reviewed transcripts are returned.",
  }
}
