# Fund Docs Slack Agent Spec

## 1. Recommendation

Build the Slack agent as a narrow Next.js webhook and runtime around the existing shared `searchFundDocs()` function.

Reason: Slack delivery, signature verification, retry dedupe, and threaded replies are separate concerns from fund indexing and retrieval. Keeping the Slack agent thin preserves the Fund Indexer Agent boundary and avoids duplicate vector-query logic.

## 2. Role And Scope

The Fund Docs Slack Agent answers Slack app mentions for the Amitis workspace configured by `SLACK_TEAM_ID`.

V1 decisions:
- Mentions only.
- Explicit fund required.
- Any Amitis Slack user in the configured workspace can ask.
- Read-only fund-document search.

## 3. Interfaces

Route:
- `POST /oig/slack/api/events`

Slack app:
- Event Subscription URL: `https://<domain>/oig/slack/api/events`
- Bot event: `app_mention`
- Bot scopes: `app_mentions:read`, `chat:write`

Environment:
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_TEAM_ID`
- Existing OpenAI, Anthropic, and Supabase service-role environment variables.

## 4. Runtime Flow

1. Read the raw request body.
2. Verify Slack HMAC signature and timestamp.
3. Handle `url_verification` with the challenge response.
4. Ignore non-`event_callback`, non-`app_mention`, or wrong-team events.
5. Insert `event_id` into `slack_fund_doc_events`; duplicates are acknowledged without processing.
6. Return 2xx quickly.
7. Use Next.js `after()` to process:
   - Parse the fund from the manifest.
   - Require a question.
   - Call `searchFundDocs({ fundSlug, question })`.
   - Format a cited Slack answer.
   - Post a thread reply with `chat.postMessage`.
   - Update event status and response timestamp.

## 5. Data Plan

New Supabase table:
- `slack_fund_doc_events`

Purpose:
- Idempotency for Slack retries.
- Basic operator visibility into processing status.
- Error capture without storing secrets.

The table is not a durable OIG interaction source. It is webhook runtime infrastructure.

## 6. Guardrails

- The manifest at `agents/fund-indexer/fund-source-roots.json` is the fund source of truth.
- Slack text can select only one fund.
- Retrieval must go through `src/app/oig/_shared/fund-doc-search.ts`.
- Slack formatting must include citations when an answer is factual.
- Missing citations cause a refusal-style reply.

## 7. Verification Plan

Unit-style checks:
- Slack signature verification accepts current valid signatures and rejects stale timestamps.
- URL verification challenge is extracted.
- Fund parsing handles examples such as `@FundDocs For Wincent, what are management fee terms?`
- Missing fund returns an ask-for-fund reply.
- Slack answer formatting includes citation metadata.

Repo checks:
- TypeScript check for the new OIG Slack files.
- ESLint on the new route/runtime files.
- Confirm no secrets appear in tracked files.
