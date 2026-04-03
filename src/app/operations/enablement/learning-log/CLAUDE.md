# Learning Log — CLAUDE.md

Browse and search technical concepts captured during work sessions.

## Owns

- **page.tsx:** Live page with LearningLogTab component
- **Supabase table:** `learning_log` (read-only from this UI — writes come from the learning-log skill)

## Status

Active.

## Connections

- Reads from Supabase `learning_log` table
- Entries written by the global `learning-log` Claude Code skill during sessions
- Category-indexed for browsing and search
