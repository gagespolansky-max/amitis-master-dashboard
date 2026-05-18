import { AttioClient } from "./attio-client"
import {
  analyzeTranscript,
  synthesizeProfile,
  summarizeTranscriptForSlack,
  TRANSCRIPT_ANALYSIS_PROMPT_VERSION,
  PROFILE_SYNTHESIS_PROMPT_VERSION,
  SLACK_SUMMARY_PROMPT_VERSION,
} from "./llm"
import {
  appendObservations,
  findExistingTranscript,
  findOrCreateCounterpartyProfile,
  logLlmCall,
  markTranscriptStatus,
  readProfileObservations,
  replaceParticipants,
  updateProfileSynthesis,
  updateTranscriptAnalysis,
  updateTranscriptFetched,
  upsertTranscriptReceived,
  type CounterpartyProfileRow,
} from "./memory"
import { normalizeTranscript } from "./normalize"
import { isAttioTranscriptSlackConfigured, notifyAttioTranscriptSlack } from "./slack"
import { isInternalEmail, type AttioCallRecording, type AttioMeeting } from "./types"

const READY_STATUSES = new Set(["ready_for_review", "reviewed", "ignored"])

export interface IngestRequest {
  hoursBack?: number
  maxMeetings?: number
  maxRecordings?: number
  force?: boolean
}

export interface IngestResult {
  meetings_examined: number
  recordings_examined: number
  transcripts_processed: number
  transcripts_skipped: number
  transcripts_ignored: number
  transcripts_errored: number
  profiles_updated: number
  duration_ms: number
  errors: Array<{ meeting_id: string; call_recording_id?: string; error: string }>
}

export interface IngestRecordingRequest {
  meetingId: string
  callRecordingId: string
  force?: boolean
}

export async function runAttioTranscriptIngest(req: IngestRequest = {}): Promise<IngestResult> {
  const started = Date.now()
  const result: IngestResult = {
    meetings_examined: 0,
    recordings_examined: 0,
    transcripts_processed: 0,
    transcripts_skipped: 0,
    transcripts_ignored: 0,
    transcripts_errored: 0,
    profiles_updated: 0,
    duration_ms: 0,
    errors: [],
  }

  const client = new AttioClient()
  const hoursBack = Math.min(24 * 14, Math.max(1, req.hoursBack ?? 72))
  const startsBefore = new Date().toISOString()
  const endsFrom = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
  const maxMeetings = Math.min(200, Math.max(1, req.maxMeetings ?? 50))
  const maxRecordings = Math.min(200, Math.max(1, req.maxRecordings ?? 25))

  const meetings: AttioMeeting[] = []
  let cursor: string | null = null
  while (meetings.length < maxMeetings) {
    const page = await client.listMeetings({
      endsFrom,
      startsBefore,
      limit: Math.min(100, maxMeetings - meetings.length),
      cursor: cursor ?? undefined,
    })
    meetings.push(...page.data)
    cursor = page.nextCursor
    if (!cursor || page.data.length === 0) break
  }

  result.meetings_examined = meetings.length

  for (const meeting of meetings) {
    if (result.recordings_examined >= maxRecordings) break
    const meetingId = meeting.id.meeting_id
    try {
      const recordings = await client.listCallRecordings(meetingId)
      for (const recording of recordings) {
        if (result.recordings_examined >= maxRecordings) break
        result.recordings_examined += 1
        if (recording.status !== "completed") {
          result.transcripts_skipped += 1
          continue
        }
        const existing = await findExistingTranscript({
          meetingId,
          recordingId: recording.id.call_recording_id,
        })
        if (existing && READY_STATUSES.has(existing.status) && !req.force) {
          result.transcripts_skipped += 1
          continue
        }
        const processed = await processRecording({ client, meeting, recording })
        result.transcripts_processed += processed.processed ? 1 : 0
        result.transcripts_ignored += processed.ignored ? 1 : 0
        result.profiles_updated += processed.profilesUpdated
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error"
      result.errors.push({ meeting_id: meetingId, error: message })
      result.transcripts_errored += 1
    }
  }

  result.duration_ms = Date.now() - started
  return result
}

export async function runAttioTranscriptIngestForRecording(
  req: IngestRecordingRequest,
): Promise<IngestResult> {
  const started = Date.now()
  const result: IngestResult = {
    meetings_examined: 1,
    recordings_examined: 1,
    transcripts_processed: 0,
    transcripts_skipped: 0,
    transcripts_ignored: 0,
    transcripts_errored: 0,
    profiles_updated: 0,
    duration_ms: 0,
    errors: [],
  }

  const client = new AttioClient()

  try {
    const [meeting, recording] = await Promise.all([
      client.getMeeting(req.meetingId),
      client.getCallRecording(req.meetingId, req.callRecordingId),
    ])

    if (recording.status !== "completed") {
      result.transcripts_skipped = 1
      return result
    }

    const existing = await findExistingTranscript({
      meetingId: req.meetingId,
      recordingId: req.callRecordingId,
    })
    if (existing && READY_STATUSES.has(existing.status) && !req.force) {
      result.transcripts_skipped = 1
      return result
    }

    const processed = await processRecording({ client, meeting, recording })
    result.transcripts_processed = processed.processed ? 1 : 0
    result.transcripts_ignored = processed.ignored ? 1 : 0
    result.profiles_updated = processed.profilesUpdated
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    result.errors.push({
      meeting_id: req.meetingId,
      call_recording_id: req.callRecordingId,
      error: message,
    })
    result.transcripts_errored = 1
  } finally {
    result.duration_ms = Date.now() - started
  }

  return result
}

async function processRecording(args: {
  client: AttioClient
  meeting: AttioMeeting
  recording: AttioCallRecording
}): Promise<{ processed: boolean; ignored: boolean; profilesUpdated: number }> {
  const transcript = await args.client.getCallTranscript(
    args.recording.id.meeting_id,
    args.recording.id.call_recording_id,
  )
  const normalized = normalizeTranscript({
    meeting: args.meeting,
    recording: args.recording,
    transcript,
  })
  const { id: callId } = await upsertTranscriptReceived(normalized)

  try {
    await updateTranscriptFetched(callId, normalized)

    if (!normalized.rawTranscript.trim()) {
      await markTranscriptStatus(callId, "needs_human_review", "Attio returned no transcript segments")
      return { processed: false, ignored: false, profilesUpdated: 0 }
    }

    const participants = await replaceParticipants(callId, normalized.participants)
    const externalParticipants = participants.filter((p) => !isInternalEmail(p.email))
    if (externalParticipants.length === 0) {
      await markTranscriptStatus(callId, "ignored", "No external participants found")
      return { processed: false, ignored: true, profilesUpdated: 0 }
    }

    let analysisResult: Awaited<ReturnType<typeof analyzeTranscript>>
    try {
      analysisResult = await analyzeTranscript({
        title: normalized.title,
        callDate: normalized.callDate,
        participants: normalized.participants.map((p) => ({
          display_name: p.display_name,
          email: p.email,
          firm_name: p.firm_name,
        })),
        transcript: normalized.rawTranscript,
      })
      await logLlmCall({
        callTranscriptId: callId,
        task: "analyze_transcript",
        promptVersion: TRANSCRIPT_ANALYSIS_PROMPT_VERSION,
        inputPayload: { title: normalized.title, callDate: normalized.callDate },
        outputPayload: analysisResult.parsed,
        rawOutput: analysisResult.rawText,
        latencyMs: analysisResult.latencyMs,
        inputTokens: analysisResult.inputTokens,
        outputTokens: analysisResult.outputTokens,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error"
      await logLlmCall({
        callTranscriptId: callId,
        task: "analyze_transcript",
        promptVersion: TRANSCRIPT_ANALYSIS_PROMPT_VERSION,
        inputPayload: { title: normalized.title, callDate: normalized.callDate },
        error: message,
      })
      await markTranscriptStatus(callId, "needs_human_review", message)
      return { processed: false, ignored: false, profilesUpdated: 0 }
    }

    await updateTranscriptAnalysis(callId, analysisResult.parsed)
    const profiles = await ensureProfiles({
      analysisFirmName: analysisResult.parsed.firm_name,
      externalParticipants,
    })
    const observationIds = await appendObservations({
      callId,
      callDate: normalized.callDate,
      analysis: analysisResult.parsed,
      participants,
      profiles,
    })

    let profilesUpdated = 0
    for (const profile of profiles) {
      const observations = await readProfileObservations(profile.id)
      if (observations.length === 0) continue
      try {
        const synthesis = await synthesizeProfile({
          counterpartyName: profile.name,
          observations: observations.map((row) => ({
            id: String(row.id),
            observation_date: String(row.observation_date),
            topic: String(row.topic),
            observation_type: String(row.observation_type),
            claim: String(row.claim),
            evidence: row.evidence ? String(row.evidence) : null,
            speaker_name: row.speaker_name ? String(row.speaker_name) : null,
          })),
        })
        await updateProfileSynthesis({
          profileId: profile.id,
          synthesis: synthesis.parsed,
          observationIds: observations.map((row) => String(row.id)),
          lastCallAt: normalized.callDate,
        })
        await logLlmCall({
          callTranscriptId: callId,
          counterpartyProfileId: profile.id,
          task: "synthesize_profile",
          promptVersion: PROFILE_SYNTHESIS_PROMPT_VERSION,
          inputPayload: { counterpartyName: profile.name, observationCount: observations.length },
          outputPayload: synthesis.parsed,
          rawOutput: synthesis.rawText,
          latencyMs: synthesis.latencyMs,
          inputTokens: synthesis.inputTokens,
          outputTokens: synthesis.outputTokens,
        })
        profilesUpdated += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error"
        await logLlmCall({
          callTranscriptId: callId,
          counterpartyProfileId: profile.id,
          task: "synthesize_profile",
          promptVersion: PROFILE_SYNTHESIS_PROMPT_VERSION,
          inputPayload: { counterpartyName: profile.name, observationCount: observations.length },
          error: message,
        })
        throw err
      }
    }

    await markTranscriptStatus(callId, "profiles_updated")
    const finalStatus = observationIds.length > 0 ? "ready_for_review" : "needs_human_review"
    await markTranscriptStatus(callId, finalStatus, observationIds.length > 0 ? undefined : "No observations extracted")
    if (finalStatus === "ready_for_review" && isAttioTranscriptSlackConfigured()) {
      try {
        const slackSummary = await summarizeTranscriptForSlack({
          title: normalized.title,
          callDate: normalized.callDate,
          participants: normalized.participants.map((p) => ({
            display_name: p.display_name,
            email: p.email,
            firm_name: p.firm_name,
          })),
          transcript: normalized.rawTranscript,
          analysis: analysisResult.parsed,
        })
        await logLlmCall({
          callTranscriptId: callId,
          task: "slack_call_summary",
          promptVersion: SLACK_SUMMARY_PROMPT_VERSION,
          inputPayload: { title: normalized.title, callDate: normalized.callDate },
          outputPayload: slackSummary.parsed,
          rawOutput: slackSummary.rawText,
          latencyMs: slackSummary.latencyMs,
          inputTokens: slackSummary.inputTokens,
          outputTokens: slackSummary.outputTokens,
        })
        await notifyAttioTranscriptSlack({
          callId,
          normalized,
          summary: slackSummary.parsed,
          labels: analysisResult.parsed.labels,
          analysisPeople: analysisResult.parsed.people,
          externalParticipants,
          observationsAdded: observationIds.length,
          profilesUpdated,
        })
      } catch (err) {
        try {
          await logLlmCall({
            callTranscriptId: callId,
            task: "slack_call_summary",
            promptVersion: SLACK_SUMMARY_PROMPT_VERSION,
            inputPayload: { title: normalized.title, callDate: normalized.callDate },
            error: err instanceof Error ? err.message : String(err),
          })
        } catch {
          // Preserve ingestion success even if best-effort Slack audit logging fails.
        }
        console.error(
          `[attio-transcripts] Slack notification failed for ${callId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }
    return { processed: true, ignored: false, profilesUpdated }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error"
    await markTranscriptStatus(callId, "error", message)
    throw err
  }
}

async function ensureProfiles(args: {
  analysisFirmName: string | null
  externalParticipants: Array<{
    firm_name: string | null
    email: string | null
    attio_company_id: string | null
  }>
}): Promise<CounterpartyProfileRow[]> {
  const profiles = new Map<string, CounterpartyProfileRow>()
  for (const participant of args.externalParticipants) {
    const domain = participant.email?.split("@").pop()?.toLowerCase() ?? null
    const name = args.analysisFirmName ?? participant.firm_name ?? domain ?? "Unknown Counterparty"
    const profile = await findOrCreateCounterpartyProfile({
      name,
      domain,
      attioCompanyId: participant.attio_company_id,
    })
    profiles.set(profile.id, profile)
  }
  return [...profiles.values()]
}
