import { createServerClient as createServiceRoleClient } from "@/lib/supabase-server"
import {
  PROFILE_SYNTHESIS_PROMPT_VERSION,
  TRANSCRIPT_ANALYSIS_PROMPT_VERSION,
  TRANSCRIPT_MODEL,
  type ProfileSynthesis,
  type TranscriptAnalysis,
} from "./llm"
import type { NormalizedParticipant, NormalizedTranscript, TranscriptStatus } from "./types"

export interface ParticipantMemoryRow {
  id: string
  display_name: string | null
  email: string | null
  firm_name: string | null
  attio_company_id: string | null
  company_identity_id: string | null
  person_identity_id: string | null
  participant_identity_id: string | null
  inferred_role: string | null
}

export interface CounterpartyProfileRow {
  id: string
  name: string
  domain: string | null
}

export interface TranscriptReviewObservation {
  id: string
  topic: string
  observation_type: string
  claim: string
  evidence: string | null
  speaker_name: string | null
  confidence: number | null
  profile: {
    id: string
    name: string
    domain: string | null
  } | null
}

export interface TranscriptReviewRow {
  id: string
  call_date: string
  title: string | null
  summary: unknown
  classification: unknown
  labels: string[]
  status: TranscriptStatus
  source_url: string | null
  processing_error: string | null
  processed_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  participants: ParticipantMemoryRow[]
  observations: TranscriptReviewObservation[]
}

type EmbeddedProfile = TranscriptReviewObservation["profile"] | NonNullable<TranscriptReviewObservation["profile"]>[]
type RawTranscriptReviewRow = Omit<TranscriptReviewRow, "observations"> & {
  observations: Array<Omit<TranscriptReviewObservation, "profile"> & { profile: EmbeddedProfile }>
}

export async function findExistingTranscript(args: {
  meetingId: string
  recordingId: string
}): Promise<{ id: string; status: string } | null> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("call_transcripts")
    .select("id, status")
    .eq("attio_meeting_id", args.meetingId)
    .eq("attio_call_recording_id", args.recordingId)
    .maybeSingle()
  if (error) throw new Error(`findExistingTranscript: ${error.message}`)
  return data as { id: string; status: string } | null
}

export async function upsertTranscriptReceived(input: NormalizedTranscript): Promise<{ id: string }> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("call_transcripts")
    .upsert({
      attio_workspace_id: input.workspaceId,
      attio_meeting_id: input.meetingId,
      attio_call_recording_id: input.callRecordingId,
      attio_call_recording_status: input.recordingStatus,
      attio_created_at: input.recordingCreatedAt,
      call_date: input.callDate,
      title: input.title,
      source_url: input.sourceUrl,
      status: "received",
      processing_error: null,
    }, { onConflict: "attio_meeting_id,attio_call_recording_id" })
    .select("id")
    .single()
  if (error || !data) throw new Error(`upsertTranscriptReceived: ${error?.message ?? "no row"}`)
  return { id: data.id as string }
}

export async function updateTranscriptFetched(callId: string, input: NormalizedTranscript): Promise<void> {
  const admin = createServiceRoleClient()
  const { error } = await admin
    .from("call_transcripts")
    .update({
      raw_transcript: input.rawTranscript,
      transcript_segments: input.segments,
      status: "transcript_fetched",
      processing_error: null,
    })
    .eq("id", callId)
  if (error) throw new Error(`updateTranscriptFetched: ${error.message}`)
}

export async function updateTranscriptAnalysis(
  callId: string,
  analysis: TranscriptAnalysis,
): Promise<void> {
  const admin = createServiceRoleClient()
  const { error: classifiedError } = await admin
    .from("call_transcripts")
    .update({
      classification: {
        call_type: analysis.call_type,
        firm_name: analysis.firm_name,
        people: analysis.people,
        topics: analysis.topics,
        asks: analysis.asks,
        follow_ups: analysis.follow_ups,
        sentiment: analysis.sentiment,
        risks: analysis.risks,
      },
      labels: analysis.labels,
      status: "classified",
    })
    .eq("id", callId)
  if (classifiedError) throw new Error(`updateTranscriptAnalysis classified: ${classifiedError.message}`)

  const { error: summarizedError } = await admin
    .from("call_transcripts")
    .update({
      summary: analysis.summary,
      status: "summarized",
    })
    .eq("id", callId)
  if (summarizedError) throw new Error(`updateTranscriptAnalysis summarized: ${summarizedError.message}`)
}

export async function markTranscriptStatus(
  callId: string,
  status: "profiles_updated" | "ready_for_review" | "ignored" | "needs_human_review" | "error",
  errorMessage?: string,
): Promise<void> {
  const admin = createServiceRoleClient()
  const updates: Record<string, unknown> = {
    status,
    processing_error: errorMessage ?? null,
  }
  if (status === "ready_for_review") updates.processed_at = new Date().toISOString()
  const { error } = await admin.from("call_transcripts").update(updates).eq("id", callId)
  if (error) throw new Error(`markTranscriptStatus: ${error.message}`)
}

export async function listTranscriptReviewQueue(args: {
  statuses?: TranscriptStatus[]
  limit?: number
} = {}): Promise<TranscriptReviewRow[]> {
  const admin = createServiceRoleClient()
  const statuses = args.statuses ?? ["ready_for_review", "needs_human_review"]
  const limit = Math.min(100, Math.max(1, args.limit ?? 25))
  const { data, error } = await admin
    .from("call_transcripts")
    .select(`
      id,
      call_date,
      title,
      summary,
      classification,
      labels,
      status,
      source_url,
      processing_error,
      processed_at,
      reviewed_at,
      reviewed_by,
      participants:call_participants(
        id,
        display_name,
        email,
        firm_name,
        attio_company_id,
        company_identity_id,
        person_identity_id,
        participant_identity_id,
        inferred_role
      ),
      observations:counterparty_observations(
        id,
        topic,
        observation_type,
        claim,
        evidence,
        speaker_name,
        confidence,
        profile:counterparty_profiles(
          id,
          name,
          domain
        )
      )
    `)
    .in("status", statuses)
    .order("call_date", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`listTranscriptReviewQueue: ${error.message}`)

  const rows = (data ?? []) as unknown as RawTranscriptReviewRow[]
  return rows.map((row) => ({
    ...row,
    observations: row.observations.map((observation) => ({
      ...observation,
      profile: Array.isArray(observation.profile) ? observation.profile[0] ?? null : observation.profile,
    })),
  }))
}

export async function markTranscriptReviewed(args: {
  transcriptId: string
  status: "reviewed" | "ignored"
  reviewedBy: string
}): Promise<void> {
  const admin = createServiceRoleClient()
  const { error } = await admin
    .from("call_transcripts")
    .update({
      status: args.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: args.reviewedBy,
      processing_error: null,
    })
    .eq("id", args.transcriptId)
    .in("status", ["ready_for_review", "needs_human_review"])

  if (error) throw new Error(`markTranscriptReviewed: ${error.message}`)
}

export async function replaceParticipants(
  callId: string,
  participants: NormalizedParticipant[],
): Promise<ParticipantMemoryRow[]> {
  const admin = createServiceRoleClient()
  const { error: deleteError } = await admin
    .from("call_participants")
    .delete()
    .eq("call_transcript_id", callId)
  if (deleteError) throw new Error(`replaceParticipants delete: ${deleteError.message}`)

  const rows = []
  for (const participant of participants) {
    rows.push({
      call_transcript_id: callId,
      display_name: participant.display_name,
      email: participant.email,
      firm_name: participant.firm_name,
      attio_person_id: participant.attio_person_id,
      attio_company_id: participant.attio_company_id,
      company_identity_id: participant.company_identity_id,
      person_identity_id: participant.person_identity_id,
      participant_identity_id: participant.participant_identity_id,
      inferred_role: participant.inferred_role,
      is_organizer: participant.is_organizer,
      raw: participant.raw,
    })
  }

  if (rows.length === 0) return []
  const { data, error } = await admin
    .from("call_participants")
    .insert(rows)
    .select("id, display_name, email, firm_name, attio_company_id, company_identity_id, person_identity_id, participant_identity_id, inferred_role")
  if (error) throw new Error(`replaceParticipants insert: ${error.message}`)
  return (data ?? []) as ParticipantMemoryRow[]
}

export async function findOrCreateCounterpartyProfile(args: {
  name: string
  domain?: string | null
  attioCompanyId?: string | null
}): Promise<CounterpartyProfileRow> {
  const admin = createServiceRoleClient()

  if (args.attioCompanyId) {
    const { data } = await admin
      .from("counterparty_profiles")
      .select("id, name, domain")
      .eq("attio_company_id", args.attioCompanyId)
      .maybeSingle()
    if (data) return data as CounterpartyProfileRow
  }

  if (args.domain) {
    const { data } = await admin
      .from("counterparty_profiles")
      .select("id, name, domain")
      .eq("domain", args.domain)
      .maybeSingle()
    if (data) return data as CounterpartyProfileRow
  }

  const { data: byName } = await admin
    .from("counterparty_profiles")
    .select("id, name, domain")
    .ilike("name", args.name)
    .maybeSingle()
  if (byName) return byName as CounterpartyProfileRow

  const { data: created, error } = await admin
    .from("counterparty_profiles")
    .insert({
      name: args.name,
      domain: args.domain ?? null,
      attio_company_id: args.attioCompanyId ?? null,
    })
    .select("id, name, domain")
    .single()
  if (error || !created) throw new Error(`findOrCreateCounterpartyProfile: ${error?.message ?? "no row"}`)
  return created as CounterpartyProfileRow
}

export async function appendObservations(args: {
  callId: string
  callDate: string
  analysis: TranscriptAnalysis
  participants: ParticipantMemoryRow[]
  profiles: CounterpartyProfileRow[]
}): Promise<string[]> {
  const admin = createServiceRoleClient()
  const fallbackProfile = args.profiles[0]
  if (!fallbackProfile) return []

  const rows = args.analysis.observations.map((observation) => {
    const participant = args.participants.find((p) =>
      p.display_name?.toLowerCase() === observation.speaker_name?.toLowerCase(),
    )
    const profile =
      args.profiles.find((p) => p.name.toLowerCase() === observation.counterparty_name.toLowerCase()) ??
      fallbackProfile
    return {
      counterparty_profile_id: profile.id,
      call_transcript_id: args.callId,
      call_participant_id: participant?.id ?? null,
      observation_date: args.callDate,
      topic: observation.topic.trim().toLowerCase(),
      observation_type: observation.observation_type,
      claim: observation.claim.trim(),
      evidence: observation.evidence,
      speaker_name: observation.speaker_name ?? "unknown",
      confidence: observation.confidence,
      metadata: { prompt_version: TRANSCRIPT_ANALYSIS_PROMPT_VERSION },
    }
  }).filter((row) => row.claim.length > 0 && row.topic.length > 0)

  if (rows.length === 0) return []

  const { data, error } = await admin
    .from("counterparty_observations")
    .upsert(rows, {
      onConflict: "call_transcript_id,topic,claim,speaker_name",
      ignoreDuplicates: true,
    })
    .select("id")
  if (error) throw new Error(`appendObservations: ${error.message}`)
  return (data ?? []).map((row) => row.id as string)
}

export async function readProfileObservations(profileId: string) {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("counterparty_observations")
    .select("id, observation_date, topic, observation_type, claim, evidence, speaker_name")
    .eq("counterparty_profile_id", profileId)
    .order("observation_date", { ascending: false })
    .limit(200)
  if (error) throw new Error(`readProfileObservations: ${error.message}`)
  return data ?? []
}

export async function updateProfileSynthesis(args: {
  profileId: string
  synthesis: ProfileSynthesis
  observationIds: string[]
  lastCallAt: string
}): Promise<void> {
  const admin = createServiceRoleClient()
  const { count, error: countError } = await admin
    .from("counterparty_observations")
    .select("id", { count: "exact", head: true })
    .eq("counterparty_profile_id", args.profileId)
  if (countError) throw new Error(`updateProfileSynthesis count: ${countError.message}`)

  const { error } = await admin
    .from("counterparty_profiles")
    .update({
      profile_summary: args.synthesis.profile_summary,
      relationship_status: args.synthesis.relationship_status,
      current_needs: args.synthesis.current_needs,
      preferences: args.synthesis.preferences,
      risks: args.synthesis.risks,
      last_call_at: args.lastCallAt,
      source_observation_count: count ?? args.observationIds.length,
      synthesized_from_observation_ids: args.observationIds,
      synthesis_payload: {
        prompt_version: PROFILE_SYNTHESIS_PROMPT_VERSION,
        model: TRANSCRIPT_MODEL,
      },
    })
    .eq("id", args.profileId)
  if (error) throw new Error(`updateProfileSynthesis: ${error.message}`)
}

export async function logLlmCall(args: {
  callTranscriptId?: string | null
  counterpartyProfileId?: string | null
  task: "analyze_transcript" | "synthesize_profile" | "slack_call_summary"
  promptVersion: string
  inputPayload: unknown
  outputPayload?: unknown
  rawOutput?: string | null
  latencyMs?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  error?: string | null
}): Promise<void> {
  const admin = createServiceRoleClient()
  const { error } = await admin.from("llm_call_log").insert({
    call_transcript_id: args.callTranscriptId ?? null,
    counterparty_profile_id: args.counterpartyProfileId ?? null,
    task: args.task,
    prompt_version: args.promptVersion,
    model: TRANSCRIPT_MODEL,
    input_payload: args.inputPayload,
    output_payload: args.outputPayload ?? null,
    raw_output: args.rawOutput ?? null,
    latency_ms: args.latencyMs ?? null,
    input_tokens: args.inputTokens ?? null,
    output_tokens: args.outputTokens ?? null,
    error: args.error ?? null,
  })
  if (error) throw new Error(`logLlmCall: ${error.message}`)
}
