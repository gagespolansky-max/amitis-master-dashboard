# Fund Returns

## What this module does
Displays fund returns extracted by the daily cron job (`~/fund-return-dashboard/src/cron_runner.py`). Read-only data view with manual verification toggle.

## Supabase tables owned
- `fund_returns` — one row per fund per month, with verification state

## Supabase Storage
- `fund-return-audits` bucket — audit PDFs and email screenshots

## API routes
- `POST /portfolio/fund-returns/api/verify` — toggle verified status on a record

## Status: Active

## Two parallel pipelines (why this is more complex than it looks)

**Pipeline 1 — source of truth** (Cowork fund-returns skill):
Gmail → extract returns → Portfolio Model (NAV_BTC + NAV_USD sheets) → 01 ACDAM Net Returns Internal (perf chart + VAMI chart) → branches to:
- Master Comps (net return → risk statistics)
- One-Pagers
Both 01 ACDAM Net Returns (perf chart, VAMI) and Master Comps (risk stats) feed into One-Pagers. One-Pagers → Performance Newsletter (Mailchimp — literally just the one-pagers packaged).

**Pipeline 2 — display only** (Flask dashboard):
Gmail → extract returns → Notion → fund-returns-dashboard (Flask, port 5050). Iframed into master dashboard at this route.

**Reconciliation:** green/red dot on dashboard compares Pipeline 2 values against Pipeline 1. Portfolio Model is the canonical source of truth. Dashboard reads but never writes.

## Reporting realities

Returns arrive through multiple channels: email body, PDF attachment, Telegram (Grandline), portal via Playwright scrape (Eltican).

Report stages:
- **MTD** — irregular, could be weekly
- **EOM** — month close
- **Investor statement** — final, always net, arrives 15–30+ days later

Same fund may send gross one week and net the next. Confidence hierarchy used to pick current row:
- 3 = investor_statement
- 2 = eom
- 1 = mtd

Trigger on `fund_returns` insert sets `is_current` — highest confidence wins, ties broken by most recent.
