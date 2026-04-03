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
