# ACIO — CLAUDE.md

Organizational parent module for ACIO investment operations. page.tsx redirects to /acio/deals.

## Owns

- **page.tsx:** Redirect only
- **Children:** deals/ (deal pipeline), investment-memos/ (each has own CLAUDE.md)

## Status

In progress.

## Connections

- No owned tables, components, or API routes — purely organizational
- Deal pipeline handles sourcing and tracking (acio/deals)
- Investment memos will consume deal data for memo generation (acio/investment-memos)
