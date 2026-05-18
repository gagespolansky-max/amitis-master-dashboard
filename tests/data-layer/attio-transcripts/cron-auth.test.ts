import assert from "node:assert/strict"
import test from "node:test"

import { authorizeCronRequest } from "../../../src/lib/data-layer/attio-transcripts/cron-auth"

test("rejects cron GET when CRON_SECRET is not configured", async () => {
  const result = await authorizeCronRequest(new Headers(), undefined)

  assert.equal(result.authorized, false)
  assert.equal(result.status, 401)
})

test("rejects cron GET without the expected bearer token", async () => {
  const result = await authorizeCronRequest(new Headers(), "secret")

  assert.equal(result.authorized, false)
  assert.equal(result.status, 401)
})

test("accepts cron GET with the expected bearer token", async () => {
  const headers = new Headers({ authorization: "Bearer secret" })
  const result = await authorizeCronRequest(headers, "secret")

  assert.equal(result.authorized, true)
})
