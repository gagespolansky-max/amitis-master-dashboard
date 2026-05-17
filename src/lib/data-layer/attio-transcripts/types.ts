export const INTERNAL_DOMAINS = ["amitiscapital.com", "theamitisgroup.com"]

export type TranscriptStatus =
  | "received"
  | "transcript_fetched"
  | "classified"
  | "summarized"
  | "profiles_updated"
  | "ready_for_review"
  | "reviewed"
  | "ignored"
  | "needs_human_review"
  | "error"

export interface AttioMeeting {
  id: {
    workspace_id?: string
    meeting_id: string
  }
  title?: string | null
  description?: string | null
  start?: { datetime?: string | null; timezone?: string | null } | null
  end?: { datetime?: string | null; timezone?: string | null } | null
  participants?: AttioMeetingParticipant[]
  linked_records?: AttioLinkedRecord[]
  created_at?: string | null
}

export interface AttioMeetingParticipant {
  status?: string | null
  is_organizer?: boolean | null
  email_address?: string | null
  name?: string | null
}

export interface AttioLinkedRecord {
  object_slug?: string | null
  object_id?: string | null
  record_id?: string | null
}

export interface AttioCallRecording {
  id: {
    workspace_id?: string
    meeting_id: string
    call_recording_id: string
  }
  status?: string | null
  web_url?: string | null
  created_at?: string | null
}

export interface AttioTranscriptSegment {
  speech?: string | null
  start_time?: number | null
  end_time?: number | null
  speaker?: { name?: string | null } | null
}

export interface NormalizedParticipant {
  display_name: string | null
  email: string | null
  firm_name: string | null
  domain: string | null
  attio_person_id: string | null
  attio_company_id: string | null
  company_identity_id: string
  person_identity_id: string
  participant_identity_id: string
  inferred_role: "internal" | "lp" | "manager" | "counterparty" | "unknown"
  is_organizer: boolean
  raw: unknown
}

export interface NormalizedTranscript {
  meetingId: string
  callRecordingId: string
  workspaceId: string | null
  title: string | null
  callDate: string
  sourceUrl: string | null
  recordingStatus: string | null
  recordingCreatedAt: string | null
  rawTranscript: string
  segments: Array<{
    speech: string
    start_time: number | null
    end_time: number | null
    speaker_name: string | null
  }>
  participants: NormalizedParticipant[]
}

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.split("@").pop()?.toLowerCase()
  return Boolean(domain && INTERNAL_DOMAINS.includes(domain))
}

export function domainFromEmail(email: string | null | undefined): string | null {
  const domain = email?.split("@").pop()?.trim().toLowerCase()
  return domain || null
}
