# Fund Accounting — CLAUDE.md

End-to-end fund accounting and NAV tracking. Currently a placeholder page.

## Owns

- **page.tsx:** Coming-soon placeholder with open questions
- **Supabase tables (designed, not yet wired):** funds, fund_returns, fund_allocations, reconciliation_log

## Status

Scoping.

## Connections

- Will read from Supabase fund returns cluster (funds, fund_returns, fund_allocations, reconciliation_log)
- Reconciliation dot will compare Pipeline 1 (Portfolio Model) vs Pipeline 2 (dashboard) values
- Open questions: data source (Excel vs Notion vs database), frequency (monthly vs quarterly), report outputs
