# Fund Docs Slack Agent Runbook

Run from the project root:

```bash
cd /Users/gage/master-dashboard
```

## Slack App Setup

Configure the Slack app with:

- Event Subscription URL: `https://<domain>/oig/slack/api/events`
- Bot event: `app_mention`
- Bot scopes: `app_mentions:read`, `chat:write`

## Environment

Required variables:

```bash
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=<bot-token>
SLACK_TEAM_ID=T...
```

The shared Fund Doc Search path also needs the existing OpenAI, Anthropic, and Supabase service-role variables.

## Validate Locally

Run the focused Slack-agent checks:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-fund-doc-slack-agent.mjs
```

Run TypeScript and lint checks:

```bash
npx tsc --noEmit --pretty false
npm run lint -- src/app/oig/slack/api/events/route.ts src/app/oig/slack/_lib
```

## Manual Smoke

Mention the bot in Slack with an explicit fund:

```text
@FundDocs For Wincent, what are the management fee terms?
```

Expected:
- The webhook responds quickly.
- The bot replies in the original message thread.
- The answer includes citations.
- A repeated Slack retry with the same `event_id` does not post a second answer.

## Failure Recovery

- `invalid_signature`: verify `SLACK_SIGNING_SECRET` and server clock skew.
- `wrong_team`: verify `SLACK_TEAM_ID`.
- `missing_fund`: ask the user to include a manifest fund name or slug.
- `no citations`: confirm the fund has been indexed; use the Fund Indexer Agent smoke query.
- `slack_api_error`: check bot token scopes and channel membership.
- `fund_doc_search RPC failed`: confirm Supabase migration/RPC and service-role env vars.

Do not repair indexing from this agent. Use `agents/fund-indexer/runbook.md`.
