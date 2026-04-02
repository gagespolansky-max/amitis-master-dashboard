# Fund Returns — CLAUDE.md

Iframes the Flask fund-returns-dashboard (port 5050) for performance tracking.

## Owns

- **page.tsx:** Iframe wrapper pointing to `FUND_RETURNS_URL` env var (default localhost:5050)
- **_components/fund-status-bar.tsx:** Client component fetching `/api/fund-configs` from Flask dashboard, shows fund chips above iframe

## Status

In progress.

## Connections

- Reads from fund-return-dashboard (Flask, separate repo at ~/fund-return-dashboard/)
- This is Pipeline 2 (display only) — Gmail → Notion → Flask dashboard → iframe here
- Reconciliation green/red dot compares Pipeline 2 values against Pipeline 1 (Portfolio Model)
- Portfolio Model is the canonical source of truth; this page only displays, never writes
