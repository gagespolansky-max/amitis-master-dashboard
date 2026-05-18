import assert from "node:assert/strict"
import test from "node:test"

import { shouldNotifySlackForCallDate } from "../../../src/lib/data-layer/attio-transcripts/ingest"

const NOW = new Date("2026-05-18T16:00:00.000Z")

test("allows Slack notification for calls inside the max age window", () => {
  assert.equal(shouldNotifySlackForCallDate("2026-05-18T10:30:00.000Z", 12, NOW), true)
})

test("skips Slack notification for older backfilled calls", () => {
  assert.equal(shouldNotifySlackForCallDate("2026-05-16T10:30:00.000Z", 12, NOW), false)
})

test("treats non-positive max age as no age gate", () => {
  assert.equal(shouldNotifySlackForCallDate("2026-05-01T10:30:00.000Z", 0, NOW), true)
})
