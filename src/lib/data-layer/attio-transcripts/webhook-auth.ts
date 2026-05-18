import { createHmac, timingSafeEqual } from "node:crypto"

export type AttioWebhookAuthResult =
  | { authorized: true }
  | { authorized: false; status: 401; body: { error: string } }

export function authorizeAttioWebhookRequest(args: {
  rawBody: string
  headers: Headers
  webhookSecret: string | undefined
}): AttioWebhookAuthResult {
  const secret = args.webhookSecret?.trim()
  if (!secret) {
    return { authorized: false, status: 401, body: { error: "Unauthorized" } }
  }

  const signature = args.headers.get("attio-signature") ?? args.headers.get("x-attio-signature")
  if (!signature) {
    return { authorized: false, status: 401, body: { error: "Unauthorized" } }
  }

  const expected = createHmac("sha256", secret).update(args.rawBody, "utf8").digest("hex")
  if (!safeEqualHex(signature.trim(), expected)) {
    return { authorized: false, status: 401, body: { error: "Unauthorized" } }
  }

  return { authorized: true }
}

function safeEqualHex(actual: string, expected: string): boolean {
  if (!/^[0-9a-f]+$/i.test(actual)) return false
  const actualBuffer = Buffer.from(actual, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}
