import { createHmac, timingSafeEqual } from "crypto"

const SIGNATURE_VERSION = "v0"
const MAX_TIMESTAMP_SKEW_SECONDS = 60 * 5

export interface SlackSignatureInput {
  signingSecret: string
  timestamp: string
  body: string
}

export interface SlackSignatureVerificationInput extends SlackSignatureInput {
  signature: string | null
  nowSeconds?: number
}

export function computeSlackSignature(input: SlackSignatureInput): string {
  const baseString = `${SIGNATURE_VERSION}:${input.timestamp}:${input.body}`
  const digest = createHmac("sha256", input.signingSecret).update(baseString).digest("hex")
  return `${SIGNATURE_VERSION}=${digest}`
}

export function verifySlackSignature(input: SlackSignatureVerificationInput): boolean {
  if (!input.signingSecret || !input.timestamp || !input.signature) return false

  const timestampSeconds = Number(input.timestamp)
  if (!Number.isFinite(timestampSeconds)) return false

  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return false
  }

  const expected = computeSlackSignature(input)
  const expectedBuffer = Buffer.from(expected, "utf8")
  const actualBuffer = Buffer.from(input.signature, "utf8")
  if (expectedBuffer.length !== actualBuffer.length) return false

  return timingSafeEqual(expectedBuffer, actualBuffer)
}
