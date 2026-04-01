# AI Initiative Tracker — CLAUDE.md

Tracks AI initiatives across the firm. Clickable cards with detail views and status progression: idea → scoping → in_progress → testing → shipped. Can link related skills.

## Owns

- **Tables:** `ai_initiatives`
- **_components/:** ai-initiatives-board.tsx
- **api/:** CRUD route for initiatives

## Status

Active.

## Connections

- Reads/writes Supabase for initiative data
- Links to skills in `skill_catalog` (display only)
