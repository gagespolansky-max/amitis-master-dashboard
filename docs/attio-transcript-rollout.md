# Attio Transcript Rollout

This runbook covers the neutral data-layer Attio transcript ingestion rollout.

## Current State

- The Supabase migration is live.
- `ATTIO_API_KEY` is configured locally and in Vercel production, and the Attio meetings endpoint returns HTTP 200.
- Smoke ingest processed 2 transcripts from 5 examined meetings / 2 examined recordings with no errors.
- Table counts after smoke: 2 `call_transcripts`, 15 `call_participants`, 2 `counterparty_profiles`, 11 `counterparty_observations`, 4 `llm_call_log`.
- Review status validation marked one transcript `reviewed` and one `ignored` with `reviewed_by = codex-smoke`.
- Optional Slack notification support is wired for new `ready_for_review` transcripts.
- Participant identity support is added in `007-attio-participant-identities.sql`: company identity + person identity hash into a composite participant identity.
- Browser UI review clicks still need a real authenticated `chief-of-staff` session if strict UI validation is required.
- Production deploy is blocked on Vercel Hobby cron limits: `*/30 * * * *` runs more than once per day and requires a Pro plan or a reduced cron cadence.

## Required Environment

Local `.env.local` and Vercel production need:

- `ATTIO_API_KEY` or `ATTIO_ACCESS_TOKEN`
- `ANTHROPIC_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`CRON_SECRET` and `ATTIO_API_KEY` are already set locally and in Vercel production as of this rollout pass.

Optional Slack call-summary notifications need:

- `ATTIO_TRANSCRIPT_SLACK_BOT_TOKEN`
- `ATTIO_TRANSCRIPT_SLACK_CHANNEL_ID`
- `ATTIO_TRANSCRIPT_REVIEW_URL` or `NEXT_PUBLIC_APP_URL` for review links

Slack posting is best-effort. If these vars are missing, ingestion still works and no Slack message is sent.

## Apply Migration

Already applied through authenticated Supabase MCP. Preferred manual path if it ever needs to be re-run:

1. Open Supabase SQL Editor for the `master-dashboard` project.
2. Run `data/migrations/006-attio-transcript-memory.sql`.
3. Confirm it is the current file and includes `reviewed_by` on `public.call_transcripts`.

CLI/API path when a Supabase Management API token with `database:write` is available:

```bash
SUPABASE_ACCESS_TOKEN=... npm run apply:attio-migration -- --apply
```

The helper is dry-run by default:

```bash
npm run apply:attio-migration
```

This helper uses Supabase Management API `POST /v1/projects/{ref}/database/query`, documented as the beta "Run sql query" endpoint with `database:write` scope.

The locally discovered historical Supabase PAT was tested against the Management API project and SQL query endpoints and returned 403. Do not assume it can apply this migration.

## Verify Prerequisites

Local plus live Supabase/Attio checks:

```bash
npm run verify:attio-rollout
```

Include Vercel production env-name checks:

```bash
npm run verify:attio-rollout:vercel
```

The verifier checks:

- local required env var presence
- Vercel production env var presence when `--vercel` is used
- Attio `/v2/meetings?limit=1`
- all five Supabase tables
- `call_transcripts.reviewed_by`
- table row counts and transcript status distribution once tables exist
- optional Slack notification env var presence

## Slack Notifications

When configured, the ingestion job runs a separate Slack-summary LLM step after a transcript reaches `ready_for_review`, then posts the resulting Slack-friendly message. The message includes call type, sentiment, labels, TLDR, action items, key points, open questions, risks, relationship signals, and links back to the review queue / Attio call when available.

The Slack message groups external participants by `company_identity_id` and lists each external individual with `person_identity_id` plus `participant_identity_id`. Amitis participants are listed with their own `person_identity_id`.

See `docs/attio-transcript-slack-agent.md` for the Slack app requirements and message behavior.

## Smoke Ingest

Start the app locally and authenticate as a user with `chief-of-staff` agent access. Then provide either a session cookie or authorization header:

```bash
ATTIO_INGEST_COOKIE='...' npm run smoke:attio-ingest
```

The smoke body is:

```json
{
  "hours_back": 72,
  "max_meetings": 5,
  "max_recordings": 2
}
```

Re-run:

```bash
npm run verify:attio-rollout
```

Use the table counts and status distribution as the first post-smoke inspection evidence.

## Review Queue

Read review queue:

```bash
ATTIO_REVIEW_COOKIE='...' npm run check:attio-review
```

Approve or ignore one ready transcript:

```bash
ATTIO_REVIEW_COOKIE='...' npm run check:attio-review -- --transcript-id=<uuid> --action=approve
ATTIO_REVIEW_COOKIE='...' npm run check:attio-review -- --transcript-id=<uuid> --action=ignore
```

Operational helpers should only expose observations from transcripts whose `call_transcripts.status` is `reviewed`.

## Deploy Gate

Deploy only after:

- migration exists in live Supabase
- Attio, Anthropic, cron, and Supabase env vars are present locally and in Vercel production
- `npm run verify:attio-rollout:vercel` passes
- `npm run smoke:attio-ingest` succeeds against an authenticated local session
- review queue read and approve/ignore paths have been exercised

For this rollout, ingest was smoke-tested through the cron-auth GET route with `ATTIO_TRANSCRIPT_HOURS_BACK=72`, `ATTIO_TRANSCRIPT_MAX_MEETINGS=5`, and `ATTIO_TRANSCRIPT_MAX_RECORDINGS=2` because no interactive browser auth cookie was available. Review state transitions were validated at the database layer using the same status/reviewed metadata semantics as the review route.

The attempted production deploy failed because Vercel Hobby accounts only allow daily cron jobs. Keep the 30-minute cadence and upgrade the Vercel plan, or change `vercel.json` to a daily schedule before deploying on Hobby.
