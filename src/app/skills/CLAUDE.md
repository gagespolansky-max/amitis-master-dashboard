# Skills Hub — CLAUDE.md

Skill management hub with tabs: Skills In Use, Marketplace (deep detail + embedded Claude advisor), Development (submissions + proposals), Eval History.

## Owns

- **Tables:** `skill_catalog`, `skill_evals`, `skill_versions`, `skill_proposals`
- **page.tsx:** Single large file containing all tab views and logic
- **api/:** analyze, assess, chat, approve, reject, bulk-approve, proposals

## Status

Active.

## Connections

- Reads/writes Supabase for all skill data
- Calls Anthropic API for skill analysis and embedded Claude chat
- Receives submissions from skill-analytics skill (Mode 3) and sync-skills.py via `skill_proposals`
- Approval flow: `skill_proposals` → admin review → `skill_catalog` via POST /api/skills/approve
