# Deals — CLAUDE.md

ACIO deal pipeline sub-module. Kanban board with sourced → committed stages plus passed column.

## Owns

- **Tables:** `acio_deals`, `deal_notes`
- **_components/:** ACIOBoard, DealCard, DealPanel, BaselineReview, EmailThread, MergeDialog, StageProgressBar
- **_lib/:** types, gmail integration, deal classification, scan-time dedup (two-tier: normalization + Haiku)
- **api/:** deals CRUD, scan, enrich, merge, memo, emails, link-thread

## Status

In progress — tables ready, UI migration from standalone app ongoing.

## Connections

- Reads Gmail via google-auth (OAuth2) for deal sourcing
- Reads/writes Supabase for deal and note persistence
- Investment memos (../investment-memos) will read deal data from this module
