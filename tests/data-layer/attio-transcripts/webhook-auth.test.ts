import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"

import { authorizeAttioWebhookRequest } from "../../../src/lib/data-layer/attio-transcripts/webhook-auth"

test("rejects Attio webhook when secret is not configured", () => {
  const result = authorizeAttioWebhookRequest({
    rawBody: "{}",
    headers: new Headers(),
    webhookSecret: undefined,
  })

  assert.equal(result.authorized, false)
  assert.equal(result.status, 401)
})

test("rejects Attio webhook without signature header", () => {
  const result = authorizeAttioWebhookRequest({
    rawBody: "{}",
    headers: new Headers(),
    webhookSecret: "secret",
  })

  assert.equal(result.authorized, false)
  assert.equal(result.status, 401)
})

test("accepts Attio webhook with matching HMAC signature", () => {
  const rawBody = JSON.stringify({ events: [] })
  const signature = createHmac("sha256", "secret").update(rawBody, "utf8").digest("hex")
  const result = authorizeAttioWebhookRequest({
    rawBody,
    headers: new Headers({ "attio-signature": signature }),
    webhookSecret: "secret",
  })

  assert.equal(result.authorized, true)
})

test("accepts legacy X-Attio-Signature header", () => {
  const rawBody = JSON.stringify({ events: [] })
  const signature = createHmac("sha256", "secret").update(rawBody, "utf8").digest("hex")
  const result = authorizeAttioWebhookRequest({
    rawBody,
    headers: new Headers({ "x-attio-signature": signature }),
    webhookSecret: "secret",
  })

  assert.equal(result.authorized, true)
})

test("rejects Attio webhook with mismatched signature", () => {
  const result = authorizeAttioWebhookRequest({
    rawBody: JSON.stringify({ events: [] }),
    headers: new Headers({ "attio-signature": "00" }),
    webhookSecret: "secret",
  })

  assert.equal(result.authorized, false)
  assert.equal(result.status, 401)
})
