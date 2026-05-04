# scripts/

Operational scripts that run from the project root. Keep scripts small, explicit, and documented here when they become part of a recurring workflow.

## Existing scripts

- `log-suggestion.py` - append enablement suggestions to `data/suggestions.json`.
- `refresh-priorities.py` - pull Gmail/Attio signals and refresh `data/priorities.json`.
- `compile-weekly-report.py` - aggregate suggestions into `data/weekly-reports.json`.
- `sync-skills.py` - scan local skills/plugins and submit changes to the Skills Hub approval flow.

## Fund Doc Search scripts

- `index_fund_docs.py` - indexer for one fund's Dropbox docs. Use `--source-provider dropbox` to list/download bytes from Dropbox via `DROPBOX_MCP_TOKEN` instead of local Smart Sync placeholders. Walks source roots, extracts text via pdfplumber/python-docx/openpyxl/csv, chunks at uniform 600 tokens / 100 overlap, embeds via OpenAI `text-embedding-3-small`, and atomically replaces chunks in Supabase through `replace_fund_document_chunks`. Idempotent by SHA-256 hash skip, observable through SQLite log + progress bar, guarded by a per-fund `fcntl.flock` lock. Default-excludes `side_letter` and `sub_agreement` until data-egress approval is recorded.
- `query_funds.py` - query CLI for Fund Doc Search. Embeds the question, retrieves top-k chunks from pgvector with similarity-floor reconciliation, and synthesizes a Claude answer with inline `[N]` citations mapping to filepath + locator. Eval-harness mode via `--eval-file`.

Fund Doc Search runtime logs belong in `data/fund_indexing_log.db`. Lockfiles belong in `data/locks/`. Real fund document fixtures must stay out of git; `data/test-fixtures/` is ignored except for `.gitkeep` placeholders.

Install Python dependencies with `pip install -r requirements-fund-doc-search.txt`.
