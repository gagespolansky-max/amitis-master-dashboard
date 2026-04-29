# Triage — CLAUDE.md

Ingestion agent. Reads raw activity from sources (Gmail, Slack, Attio, Tactiq), normalizes into structured records (`interactions`, `action_items`, `people`, `organizations`, tags), and writes to the OIG database.

## Hard rules

- **Sole writer of `interactions` and `action_items`.** No other agent writes to these tables. Triage owns ingestion.
- **Dedup by `(source_type, source_id)` natural key.** Re-running Triage over an overlapping window must not create duplicates — it should `update` existing rows or no-op.
- **Continue existing commitments, don't duplicate.** When the same thread surfaces a follow-up, find the existing open `action_item` for that interaction and update it rather than inserting a new one.
- **Confidence-tagged extractions.** Any `action_item` extracted from text gets a `confidence` value 0–1. Below ~0.6 = low-confidence, surface but don't claim certainty.
- **Source link preservation.** `interactions.source_id` (and `thread_id` where applicable) must round-trip — Chief of Staff and the user need to be able to jump back to the original message.
- **Internal-only threads ignored.** Don't create `interactions` for threads where every participant is `@amitiscapital.com` (matches existing ACIO behavior).

## Owns

- **_components/run-triage-button.tsx** — UI on `/oig` to kick a run on demand
- **_components/triage-result.tsx** — extracted-summary panel
- **_lib/tools.ts** — Gmail/Slack/Attio readers, dedup helpers, OIG DB writers
- **_lib/anthropic.ts** — Triage system prompt + tool definitions
- **_lib/run.ts** — orchestrator (builds context, invokes loop, summarizes)
- **api/run/route.ts** — POST endpoint, sync run (≤60s)

## Sources, in order of build

| Source | Tool prefix | Phase |
|---|---|---|
| Gmail | `gmail_*` | 3 |
| Attio | `attio_*` | 6 |
| Slack | `slack_*` | 9 |
| Tactiq | `tactiq_*` | 10 |

## Connections

- Reads per-user Gmail credentials via `getGmailClientForUser` (from `acio/deals/_lib/gmail.ts`) — same OAuth as ACIO scan
- Reads/writes the OIG tables created in `oig/_schema/`
- Anthropic SDK (Sonnet 4) for classification and extraction
- Future: Vercel Cron (Phase 7) calls the same API endpoint that the on-demand button calls

## Status

Phase 3 shipped — Gmail ingestion live. The panel is embedded inside `/oig/cos` (no separate sidebar tab). Phases 6/9/10 add Attio, Slack, and Tactiq sources behind the same agentic loop.
