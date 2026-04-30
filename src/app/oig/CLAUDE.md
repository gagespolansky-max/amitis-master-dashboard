# OIG — CLAUDE.md

**Operations Intelligence Engine.** A structured memory and accountability system for operations: Triage captures what happened, the database remembers it, Audit detects what is slipping, and Chief of Staff tells you what matters now.

## Architecture (per `~/Desktop/OIG/Schema/First Pass Schema/`)

```
Sources         →  Triage    →  OIG DB    →  Audit    →  COS    →  You
Gmail/Slack/        extracts     interact-    flags        reads
Attio/TACD IQ      structured   ions,         drift        clean
                    records     action_items                memory
                                + people +
                                orgs + audit
                                _findings
                                + embeddings
```

**Four agents, four roles:**

| Agent | Type | Does |
|---|---|---|
| Triage | Scheduled ingestor | Reads raw sources → writes structured records |
| Database Engineer | Build-time persona (not runtime) | Owns/evolves the Supabase schema (`_schema/`) |
| Audit | Scheduled watchdog | Reads DB → flags overdue/stale/risky/unresolved |
| Chief of Staff | User-facing reader | Reads curated state → daily brief + priorities |

Database Engineer is conceptual — there's no chatbot for it. When schema work is needed, that work happens in `_schema/` under DBE rules.

## Phase status

| Phase | Status |
|---|---|
| 1. Memory foundation (schema) | ✅ Shipped |
| 2. Module rename + COS/Triage scaffold | ✅ Shipped |
| 3. Triage v1 — Gmail ingest into OIG (sole writer) | ✅ Shipped |
| 4. COS v1 — chat shell, OIG readers, Gmail drill+draft, briefing prefs | ✅ Shipped |
| 5. Landing page polish | Pending |
| 6. Triage Attio source | Pending |
| 7. Vercel Cron for Triage | Pending |
| 8. Audit Agent | Pending |
| 9. Slack source | Pending |
| 10. TACD IQ source | Pending |
| 11. Embeddings layer | Pending (schema ready; generation later) |
| 12a. Calendar integration (read-only) | ✅ Shipped — needs user re-auth + Google Cloud scope add |
| 12b. Contacts integration | Pending (re-auth + scope add) |

## Owns

- **Tables:** `organizations`, `people`, `interactions`, `action_items`, `interaction_tags`, `action_item_tags`, `audit_findings` — see `_schema/` for the canonical schema
- **`_schema/`:** Database Engineer workspace (migrations, seed, verification, README)
- **Future children:** `cos/`, `triage/`, `audit/` (each will have its own CLAUDE.md)

## Connections

- Reads per-user Gmail credentials via `getGmailClientForUser` (from `src/app/acio/deals/_lib/gmail.ts`) — when COS / Triage are built
- Anthropic SDK for COS reasoning loops
- Optional: Voyage AI or OpenAI for embedding generation (Phase 11)
- pgvector for semantic recall

## Status

Phases 1–4 shipped. COS chat is live at `/oig/cos`, reads OIG memory + drill/draft Gmail. Triage panel is embedded on the same page; Gmail-only ingestion. Next focus: Vercel Cron for Triage (auto-refresh memory) and the Audit Agent.
