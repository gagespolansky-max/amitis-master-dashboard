import assert from "node:assert/strict"
import test from "node:test"

import { parseAttioCallRecordingCreatedEvents } from "../../../src/lib/data-layer/attio-transcripts/webhook-events"

test("extracts call-recording.created events", () => {
  const events = parseAttioCallRecordingCreatedEvents({
    webhook_id: "webhook-1",
    events: [
      {
        event_type: "call-recording.created",
        id: {
          workspace_id: "workspace-1",
          meeting_id: "meeting-1",
          call_recording_id: "recording-1",
        },
      },
    ],
  })

  assert.equal(events.length, 1)
  assert.equal(events[0]?.id.meeting_id, "meeting-1")
  assert.equal(events[0]?.id.call_recording_id, "recording-1")
})

test("ignores unsupported or malformed webhook events", () => {
  const events = parseAttioCallRecordingCreatedEvents({
    events: [
      { event_type: "note.created", id: { note_id: "note-1" } },
      { event_type: "call-recording.created", id: { meeting_id: "meeting-1" } },
      null,
    ],
  })

  assert.deepEqual(events, [])
})
