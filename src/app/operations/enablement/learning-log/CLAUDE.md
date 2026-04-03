# Learning Log — CLAUDE.md

Browse, search, and manage technical concepts captured during work sessions. Two-way: entries come from Claude Code sessions (learning-log skill) AND from the dashboard UI ("Ask Claude" feature).

## Owns

- **page.tsx:** Standalone page rendering LearningLogTab
- **_components/learning-log-tab.tsx:** Main client component — CRUD, category filter, search, Ask Claude input
- **_lib/learning-log-types.ts:** Types, category constants, color map
- **api/route.ts:** GET/PATCH/DELETE for learning_log entries
- **api/explain/route.ts:** POST — sends concepts to Claude, gets explanations, inserts to Supabase
- **Supabase table:** `learning_log`

## Status

Active.

## Connections

- Reads/writes Supabase `learning_log` table via API routes
- Also rendered as a tab inside enablement-tabs.tsx (parent)
- Entries written by: (1) Claude Code learning-log skill, (2) dashboard Ask Claude feature, (3) manual entry from dashboard
- Uses Anthropic SDK (claude-sonnet-4) for Ask Claude explanations
- Uses shared `ai-parse.ts` for response parsing
