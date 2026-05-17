import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(
  new URL("../../../src/lib/data-layer/attio-transcripts/query-tools.ts", import.meta.url),
  "utf8",
)

test("counterparty call queries use the call_transcripts relationship embed", () => {
  const selector = "call:call_transcripts!counterparty_observations_call_transcript_id_fkey!inner("
  const matches = source.match(
    /call:call_transcripts!counterparty_observations_call_transcript_id_fkey!inner\(/g,
  )

  assert.equal(matches?.length, 2)
  assert.doesNotMatch(source, /call:call_transcript_id!inner\(/)
  assert.match(source, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})
