# OIG Schema — Phase 1 Foundation

This is the **OIG Database Engineer** workspace. The schema docs in `~/Desktop/OIG/Schema/First Pass Schema/` are the architectural source of truth; everything in this folder implements Phase 1 only.

## What's in here

| File | Purpose |
|---|---|
| `migrations/001_foundation.sql` | The DDL — extensions, enums, tables, indexes, triggers, RLS |
| `seed.sql` | Realistic test data exercising open / overdue / stale / done states across two orgs and four people |
| `verification.sql` | Ten queries that prove the schema supports the patterns Audit and Chief of Staff will rely on |
| `CLAUDE.md` | Schema invariants and rules for adding to it |

## What got created

**Tables (7 total):**
- `organizations` — companies/groups (customer/prospect/investor/partner/vendor/internal)
- `people` — humans, optionally linked to an organization
- `interactions` — every external touchpoint (email, call, dm, transcript, note); has an embedding
- `action_items` — extracted commitments, hard FK to interactions for traceability; has an embedding
- `interaction_tags` — free-text tags on interactions (composite PK)
- `action_item_tags` — free-text tags on action items (composite PK)
- `audit_findings` — Audit Agent output, anchored to whichever entity the finding concerns

**Enums (6 total, all `oig_` prefixed):**
- `oig_source_type` — `gmail`, `slack`, `attio`, `tacd_iq`, `manual`
- `oig_interaction_type` — `email`, `thread`, `dm`, `call`, `meeting`, `transcript`, `note`
- `oig_action_status` — `open`, `in_progress`, `blocked`, `done`, `dropped`
- `oig_priority` — `low`, `medium`, `high`, `critical` (used by both interactions and action items)
- `oig_audit_severity` — `low`, `medium`, `high`, `critical`
- `oig_org_type` — `customer`, `prospect`, `investor`, `partner`, `vendor`, `internal`

**Extensions:** `pgcrypto` (for `gen_random_uuid()`), `vector` (pgvector for embeddings).

**Embedding columns:** `interactions.embedding` and `action_items.embedding`, both `vector(1536)`. Indexed with `ivfflat` + cosine. Dimension chosen to match OpenAI `text-embedding-3-small`; can be changed in a follow-up migration before any embeddings are written.

**RLS:** Enabled on all seven tables. **No policies.** Service role bypasses RLS, which matches the rest of the master-dashboard pattern (auth gating happens in middleware + per-route checks, not at row level). API routes must use the service-role Supabase client.

**Triggers:** A shared `oig_set_updated_at()` trigger function fires `before update` on every table that has an `updated_at` column.

**Constraints worth noting:**
- `action_items.interaction_id` is **NOT NULL** — every action item is traceable to a source.
- `action_items.completed_at` must be `not null` iff `status = 'done'` (CHECK constraint).
- `interactions.(source_type, source_id)` is **UNIQUE** — Triage can safely upsert without creating duplicates.
- `people.email` is unique (case-insensitive) where present.
- `confidence` on `action_items` is constrained to `[0, 1]`.

## Doc correction

Your schema docs use `addio` as a source type. You clarified the intended source is **Attio** (the CRM). The migration uses `attio` in the `oig_source_type` enum. If you ever do plan to ingest from a real "ADDIO" service, add it as a separate enum value via a follow-up migration.

## How to apply

**Option A (recommended) — via Supabase MCP, in this conversation:**

```text
"Apply src/app/oig/_schema/migrations/001_foundation.sql"
```

I'll run it via `mcp__supabase__apply_migration`. Per the DBE prompt, **I will not apply this until you give explicit approval** — you'll be asked first.

**Option B — manual via Supabase SQL editor:**

1. Open Supabase dashboard → SQL Editor → New Query
2. Paste the contents of `migrations/001_foundation.sql`
3. Run
4. Open another query, paste `seed.sql`, run (dev only)
5. Open another query, paste each block from `verification.sql`, run

**Option C — via supabase CLI** (if you set it up later):

```bash
supabase db push
```

## How to test

After applying both migration and seed:

1. Run query #1 from `verification.sql` — you should see 4 open action items (the 5th is `done`).
2. Run query #2 — exactly 1 overdue item (the fee schedule appendix).
3. Run query #4 — exactly 1 ownerless item (Bridge follow-up call).
4. Run query #7 — 2 unresolved audit findings.
5. Run query #10 — pgvector sanity check returns 0 rows (no embeddings written yet) and *doesn't error*. If it errors with "operator does not exist," pgvector didn't load.

If those four queries return what's described, the schema is sound.

## TypeScript types

Once applied, regenerate types so the rest of the app gets autocomplete:

```text
"Generate TypeScript types"
```

I'll run `mcp__supabase__generate_typescript_types` and we'll commit the output to wherever the project keeps generated types (most likely `src/lib/database.types.ts` — to be confirmed in Phase 2).

## Phase 2 — what comes next

Per `05-build-order.md`, Phase 2 is the **Triage Agent**:

1. Start with Gmail-only ingestion. Read recent threads, classify (`is_relevant?`), extract `interactions` rows + `action_items` rows + tag them.
2. Add Attio next (we already have the API key + integration on the dashboard).
3. ADDIO/TACD IQ transcript ingestion last in the V1 set.
4. Slack stays out until ingestion + dedup are stable.

The Triage Agent should write into the tables this migration created, using `(source_type, source_id)` as the natural key for upserts. Existing-thread updates over duplicate creation, per `01-agents.md`.

## Assumptions worth flagging

- **Embedding dimension = 1536.** Aligned with OpenAI `text-embedding-3-small`. If you end up using Voyage AI (1024-dim), we'd need a follow-up migration before any embeddings are generated.
- **Vector index = `ivfflat` with 100 lists.** Reasonable for the first ~50K rows. Bump `lists` (rule of thumb: `sqrt(rows)`) and `reindex` once the table grows.
- **Tags are free text.** Suggested vocabulary lives in `02-data-model.md`. The application is responsible for writing the right tag names; the database doesn't enforce a vocabulary.
- **`interaction_type` is an enum, not free text.** This is a slight tightening of the doc, which doesn't specify. Adding values is a one-line `ALTER TYPE` later.
- **Tables are not prefixed with `oig_`.** The DBE prompt asks not to prefix unless there's a strong technical reason. Names don't collide with anything currently in the database. The existing `meeting_action_items` table is unrelated and clearly named differently.
- **`audit_findings.related_*` columns are all nullable.** A finding might concern any combination of a person/org/action item/interaction. The Audit Agent should ensure at least one is set.

## Open questions for next phase (not blocking Phase 1)

1. Brief shape, brief trigger, action item lifecycle, TACD IQ definition (per the Phase 2 plan — answer when we start COS).
2. Where should generated TypeScript types live? Suggesting `src/lib/database.types.ts` to keep one canonical location.
3. Do we want an `interaction_view` or `action_item_view` (Postgres views) for the most common Chief of Staff queries, or do we keep all denormalization in application code? Recommend deferring views until we know the exact COS read patterns.
