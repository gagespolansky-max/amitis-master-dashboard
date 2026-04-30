# OIG Schema — CLAUDE.md

This is the **OIG Database Engineer** workspace. When changing the OIG memory layer, you are wearing the DBE hat: be schema-disciplined, non-destructive, and treat the project docs as the architectural baseline.

## Source of truth

The architectural design lives in `~/Desktop/OIG/Schema/First Pass Schema/`:
- `00-overview.md` — purpose, layers, immediate scope
- `01-agents.md` — Triage / Database Engineer / Audit / Chief of Staff roles
- `02-data-model.md` — tables, columns, suggested tags
- `03-workflows.md` — ingestion, action extraction, retrieval, audit, COS workflows
- `04-chief-of-staff-integration.md` — how COS consumes the curated layers
- `05-build-order.md` — phased implementation

If a request would meaningfully diverge from those docs (new schema commitments, workflow boundary changes), stop and surface the conflict — don't freelance.

## Schema invariants

These rules survive across migrations:

1. **Source traceability.** Every `action_items` row has a `NOT NULL` FK to `interactions`. No orphan action items.
2. **One interaction per source record.** `(source_type, source_id)` is unique on `interactions`. Triage upserts; never inserts duplicates.
3. **`completed_at` mirrors `done` status.** CHECK constraint enforces it. If you change the status enum, update the constraint.
4. **Service-role only.** RLS is enabled with no policies. API routes use the service-role client. If you ever add row-level access for anon/authenticated users, do it in a new migration with explicit policies.
5. **Tags are free text.** Vocabulary lives in app code (suggested set in `02-data-model.md`). The DB doesn't enforce a tag vocabulary.
6. **Enums are prefixed `oig_`.** Tables are not prefixed. This is the documented stance.
7. **Embedding dimension is 1536.** Changing it requires a new migration *before* any embeddings are written. Don't backfill at query time.

## File layout

```
_schema/
├── CLAUDE.md             this file — DBE invariants
├── README.md             Phase 1 deliverable summary
├── migrations/
│   └── 001_foundation.sql    do not edit; new changes go in 002, 003, ...
├── seed.sql              dev test data (NOT for production)
└── verification.sql      queries proving the schema supports COS/Audit needs
```

## Rules for adding to the schema

- **Never edit applied migrations.** Add a new file: `002_<short_name>.sql`, `003_<short_name>.sql`, etc.
- **Wrap mutations defensively.** `create table if not exists`, `do $$ if not exists ... end $$` for enum types, `drop trigger if exists` before re-creating, etc. Migrations should be re-runnable.
- **No destructive changes without an explicit ask.** Renames and column drops require user sign-off; if in doubt, `add column` + backfill instead of `drop column`.
- **Index where Audit and COS will read.** Anything they'll filter or sort by needs an index — partial indexes are OK and often better.
- **Keep RLS posture consistent.** New tables get `enable row level security` with no policies (matching the existing pattern). Add policies in a separate migration only when required.
- **Forward-compat embeddings.** If the model dimension changes, write a follow-up migration that drops the column and re-adds it with the new dimension *before* any data is generated.

## Application discipline

Do not apply migrations to the live Supabase project until the user has reviewed the SQL and explicitly approved. If using `mcp__supabase__apply_migration`, ask first; treat the response as the gate.

When asked, generate TypeScript types via `mcp__supabase__generate_typescript_types` and commit them to the standard location (currently TBD; suggest `src/lib/database.types.ts`).

## What lives outside this folder

- **Migrations for non-OIG tables** (auth, dashboard, ACIO, etc.) live at the repo root as `supabase-*-migration.sql` files. That's the legacy pattern; new OIG migrations go here.
- **OIG agents (Triage, Audit, COS)** live in `src/app/oig/{cos,triage,audit}/` (Phase 2+). Their CLAUDE.md files own the agent-level details. This file owns the schema only.
- **Generated TypeScript types** are not in this folder; they live with the rest of the lib code.
