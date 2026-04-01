# ACIO Deal Pipeline — CLAUDE.md

Investment deal pipeline for ACIO. Kanban board with under_review/invested/passed columns. Components being absorbed from standalone ~/acio/ app.

## Owns

- **Tables:** `acio_deals`, `deal_notes`
- **_components/:** ACIOBoard, DealCard, DealPanel, and related UI
- **_lib/:** types, gmail integration, deal classification
- **api/:** deals CRUD, scan, enrich, merge, memo, emails

## Status

In progress — tables ready, UI migration from standalone app ongoing.

## Connections

- Reads Gmail via google-auth (OAuth2) for deal sourcing
- Reads/writes Supabase for deal and note persistence
- No dependencies from other modules
