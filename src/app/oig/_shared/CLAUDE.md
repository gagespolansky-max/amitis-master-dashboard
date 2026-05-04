# OIG Shared Layer

Shared OIG utilities used by multiple agents. Keep reusable capabilities here when they should be available to Chief of Staff, Triage, Audit, or future OIG agents.

## Current shared utilities

- `calendar.ts` - Google Calendar client helper.
- `db.ts` - OIG structured-memory readers.
- `persistence.ts` - agent conversation/message persistence.

## Fund Doc Search shared capability

- `fund-doc-search.ts` - shared adapter/contract for the Fund Doc Search capability. It shells out to `scripts/query_funds.py --json`; keep it out of live agent tool lists until migration, indexing, and evals pass.

The shared skill should call the Fund Doc Search query layer rather than letting each OIG agent inspect Dropbox or query vector tables ad hoc. Chief of Staff is one consumer, not the owner.

When evals pass, wire `fund-doc-search` into the relevant OIG agent tool lists. For fund-document factual questions, agents should search Fund Doc Search and cite returned source chunks instead of answering from memory.
