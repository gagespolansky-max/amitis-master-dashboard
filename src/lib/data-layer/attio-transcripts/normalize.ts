import { createHash } from "node:crypto"
import { knownPersonNameForEmail } from "./identity"
import {
  type AttioCallRecording,
  type AttioLinkedRecord,
  type AttioMeeting,
  type AttioTranscriptSegment,
  domainFromEmail,
  isInternalEmail,
  type NormalizedParticipant,
  type NormalizedTranscript,
} from "./types"

const AMITIS_COMPANY_ID = "domain:amitiscapital.com"

export function inferFirmNameFromEmail(email: string | null): string | null {
  const domain = domainFromEmail(email)
  if (!domain || isInternalEmail(email)) return null
  const base = domain.split(".")[0]
  if (!base) return null
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function stableKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

function participantIdentityId(companyIdentityId: string, personIdentityId: string): string {
  const hash = createHash("sha256").update(`${companyIdentityId}|${personIdentityId}`).digest("hex")
  return `participant:${hash.slice(0, 32)}`
}

function companyIdentity(args: {
  internal: boolean
  attioCompanyId: string | null
  domain: string | null
  firmName: string | null
}): string {
  if (args.internal) return AMITIS_COMPANY_ID
  if (args.attioCompanyId) return `attio_company:${args.attioCompanyId}`
  if (args.domain) return `domain:${args.domain}`
  if (args.firmName) return `company_name:${stableKey(args.firmName)}`
  return "company:unknown"
}

function personIdentity(args: {
  attioPersonId: string | null
  email: string | null
  displayName: string | null
}): string {
  if (args.attioPersonId) return `attio_person:${args.attioPersonId}`
  if (args.email) return `email:${args.email}`
  if (args.displayName) return `person_name:${stableKey(args.displayName)}`
  return "person:unknown"
}

export function inferNameFromEmail(email: string | null): string | null {
  const local = email?.split("@")[0]
  if (!local) return null
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function firstLinkedRecord(
  linkedRecords: AttioLinkedRecord[] | undefined,
  objectSlug: "people" | "companies",
): string | null {
  const record = linkedRecords?.find((r) => r.object_slug === objectSlug)
  return record?.record_id ?? record?.object_id ?? null
}

export function normalizeParticipants(meeting: AttioMeeting): NormalizedParticipant[] {
  const linkedPersonId = firstLinkedRecord(meeting.linked_records, "people")
  const linkedCompanyId = firstLinkedRecord(meeting.linked_records, "companies")
  const seen = new Set<string>()
  const normalized: NormalizedParticipant[] = []

  for (const participant of meeting.participants ?? []) {
    const email = participant.email_address?.trim().toLowerCase() || null
    const displayName = participant.name?.trim() || knownPersonNameForEmail(email) || inferNameFromEmail(email)
    const domain = domainFromEmail(email)
    const internal = isInternalEmail(email)
    const firmName = inferFirmNameFromEmail(email)
    const attioPersonId = linkedPersonId
    const attioCompanyId = internal ? null : linkedCompanyId
    const company_identity_id = companyIdentity({
      internal,
      attioCompanyId,
      domain,
      firmName,
    })
    const person_identity_id = personIdentity({
      attioPersonId,
      email,
      displayName,
    })
    const key = email ?? displayName ?? JSON.stringify(participant)
    if (seen.has(key)) continue
    seen.add(key)

    normalized.push({
      display_name: displayName,
      email,
      firm_name: firmName,
      domain,
      attio_person_id: attioPersonId,
      attio_company_id: attioCompanyId,
      company_identity_id,
      person_identity_id,
      participant_identity_id: participantIdentityId(company_identity_id, person_identity_id),
      inferred_role: internal ? "internal" : "counterparty",
      is_organizer: Boolean(participant.is_organizer),
      raw: participant,
    })
  }

  return normalized
}

export function normalizeTranscript(args: {
  meeting: AttioMeeting
  recording: AttioCallRecording
  transcript: AttioTranscriptSegment[]
}): NormalizedTranscript {
  const segments = args.transcript.map((segment) => ({
    speech: segment.speech?.trim() ?? "",
    start_time: typeof segment.start_time === "number" ? segment.start_time : null,
    end_time: typeof segment.end_time === "number" ? segment.end_time : null,
    speaker_name: segment.speaker?.name?.trim() || null,
  })).filter((segment) => segment.speech.length > 0)

  const rawTranscript = segments.map((segment) => {
    const speaker = segment.speaker_name ?? "Unknown"
    return `${speaker}: ${segment.speech}`
  }).join("\n")

  const callDate =
    args.meeting.start?.datetime ??
    args.recording.created_at ??
    args.meeting.created_at ??
    new Date().toISOString()

  return {
    meetingId: args.recording.id.meeting_id || args.meeting.id.meeting_id,
    callRecordingId: args.recording.id.call_recording_id,
    workspaceId: args.recording.id.workspace_id ?? args.meeting.id.workspace_id ?? null,
    title: args.meeting.title?.trim() || null,
    callDate,
    sourceUrl: args.recording.web_url ?? null,
    recordingStatus: args.recording.status ?? null,
    recordingCreatedAt: args.recording.created_at ?? null,
    rawTranscript,
    segments,
    participants: normalizeParticipants(args.meeting),
  }
}
