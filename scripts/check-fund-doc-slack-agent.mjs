import assert from "node:assert/strict"

import {
  computeSlackSignature,
  verifySlackSignature,
} from "../src/app/oig/slack/_lib/slack-signature.ts"
import { getUrlVerificationChallenge } from "../src/app/oig/slack/_lib/slack-payload.ts"
import { formatFundDocSlackAnswer, formatMissingFundReply } from "../src/app/oig/slack/_lib/format.ts"
import { parseFundDocSlackMention } from "../src/app/oig/slack/_lib/fund-matching.ts"

const nowSeconds = Math.floor(Date.now() / 1000)
const body = JSON.stringify({ type: "event_callback", event_id: "Ev1" })
const signature = computeSlackSignature({
  signingSecret: "test-secret",
  timestamp: String(nowSeconds),
  body,
})

assert.equal(
  verifySlackSignature({
    signingSecret: "test-secret",
    timestamp: String(nowSeconds),
    body,
    signature,
    nowSeconds,
  }),
  true,
  "valid Slack signatures should pass",
)

assert.equal(
  verifySlackSignature({
    signingSecret: "test-secret",
    timestamp: String(nowSeconds - 600),
    body,
    signature,
    nowSeconds,
  }),
  false,
  "stale Slack timestamps should fail",
)

assert.equal(
  getUrlVerificationChallenge({ type: "url_verification", challenge: "challenge-value" }),
  "challenge-value",
  "url_verification challenge should be returned",
)

const funds = [
  { slug: "wincent", displayName: "Wincent", aliases: ["Wincent Capital"] },
  { slug: "grandline", displayName: "GrandLine" },
]

const parsed = parseFundDocSlackMention(
  "<@U123> For Wincent, what are management fee terms?",
  funds,
)
assert.equal(parsed.reason, "ok")
assert.equal(parsed.fund?.slug, "wincent")
assert.equal(parsed.question, "what are management fee terms?")

const missingFund = parseFundDocSlackMention("<@U123> What are management fee terms?", funds)
assert.equal(missingFund.reason, "missing_fund")
assert.match(formatMissingFundReply("`wincent`, `grandline`"), /include one fund/i)

const formatted = formatFundDocSlackAnswer(
  {
    fund: "wincent",
    question: "What are the management fee terms?",
    refused: false,
    answer: "Management fees are described in the PPM [1].",
    citations: [
      {
        marker: "[1]",
        filepath: "/Manager Materials/Wincent/PPM.pdf",
        locator_kind: "page",
        locator_value: "12",
        doc_type: "ppm",
        similarity: 0.81234,
      },
    ],
    retrieved_chunks: [],
  },
  { slug: "wincent", displayName: "Wincent" },
)

assert.match(formatted, /\*Citations\*/)
assert.match(formatted, /doc_type=`ppm`/)
assert.match(formatted, /page=12/)
assert.match(formatted, /similarity=0\.812/)

console.log("Fund Docs Slack Agent checks passed")
