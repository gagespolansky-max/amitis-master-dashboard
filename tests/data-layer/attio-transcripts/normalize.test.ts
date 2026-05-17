import assert from "node:assert/strict"
import test from "node:test"
import { normalizeParticipants, normalizeTranscript } from "../../../src/lib/data-layer/attio-transcripts/normalize"

test("normalizes Attio meeting participants by email and firm", () => {
  const participants = normalizeParticipants({
    id: { meeting_id: "meeting-1" },
    participants: [
      { email_address: "gage@amitiscapital.com", is_organizer: true },
      { email_address: "alex@examplefund.com", name: "Alex Example" },
    ],
  })

  assert.equal(participants.length, 2)
  assert.equal(participants[0].inferred_role, "internal")
  assert.equal(participants[1].firm_name, "Examplefund")
  assert.equal(participants[1].domain, "examplefund.com")
})

test("normalizes transcript segments into speaker-prefixed text", () => {
  const normalized = normalizeTranscript({
    meeting: {
      id: { workspace_id: "workspace-1", meeting_id: "meeting-1" },
      title: "LP update",
      start: { datetime: "2026-05-15T12:00:00.000Z" },
      participants: [],
    },
    recording: {
      id: {
        workspace_id: "workspace-1",
        meeting_id: "meeting-1",
        call_recording_id: "recording-1",
      },
      status: "completed",
      web_url: "https://app.attio.com/example",
    },
    transcript: [
      { speech: "Hello there", start_time: 0.1, end_time: 1.4, speaker: { name: "Gage" } },
      { speech: "Thanks for the update", start_time: 1.5, end_time: 2.5, speaker: { name: "Alex" } },
    ],
  })

  assert.equal(normalized.callDate, "2026-05-15T12:00:00.000Z")
  assert.equal(normalized.rawTranscript, "Gage: Hello there\nAlex: Thanks for the update")
  assert.equal(normalized.segments.length, 2)
})
