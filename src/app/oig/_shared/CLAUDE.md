# OIG Shared Layer

Shared OIG utilities used by multiple agents. Keep reusable capabilities here when they should be available to Chief of Staff, Triage, Audit, or future OIG agents.

## Current shared utilities

- `calendar.ts` - Google Calendar client helper.
- `db.ts` - OIG structured-memory readers.
- `persistence.ts` - agent conversation/message persistence.

## Fund Doc Search shared capability

- `fund-doc-search.ts` - shared adapter for the Fund Doc Search capability. Native TypeScript pipeline: OpenAI `text-embedding-3-small` → Supabase `match_fund_document_chunks` RPC → optional Claude synthesis with `[N]` citations. Runs in any Node runtime (local dev, Vercel serverless). The Python `scripts/query_funds.py` is the offline twin used for indexing-side evals; the runtime path no longer shells out.

The shared adapter is the canonical query layer. OIG agents should call `searchFundDocs` rather than inspect Dropbox or query vector tables ad hoc. Chief of Staff is one consumer, not the owner.

For fund-document factual questions, agents search Fund Doc Search and cite returned source chunks instead of answering from memory.
