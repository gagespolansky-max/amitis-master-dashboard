# Context Map — Amitis Master Dashboard

## Architecture overview

Next.js 16.2.1 (App Router) + React 19 + TypeScript 5 + Tailwind 4. Sidebar-driven layout with 8 top-level workstreams. Primary data store is Supabase; Gmail, Notion, Dropbox, and Anthropic are used via first-party API clients. Python scripts cover legacy extraction flows outside the web app.

```
src/app/
├── (auth)/login              # Google SSO — bypasses sidebar
├── auth/callback             # OAuth code exchange + Gmail token persist
├── acio/                     # Deal pipeline + investment memos
├── investor-relations/       # One-pagers, newsletters, x-posts, marketing collaterals
├── oig/                      # Operations Intelligence Engine — schema, COS, Triage
├── operations/               # Enablement, AI initiatives, organization
├── portfolio/                # Fund returns, fund accounting
├── priorities/               # AI-ranked Kanban + personal screenshot OCR
├── research/                 # Fund vetting (placeholder)
├── skills/                   # Skills Hub: marketplace, development, eval history
└── page.tsx                  # Dashboard home + priority board
```

## Design rationale

**Feature-based workstream hierarchy.** Each workstream is a top-level route that owns its own `_components/`, `_lib/`, and `api/` directories. Colocation over a shared `components/lib/api` layout — reduces cross-module coupling and lets each area evolve independently.

**Per-module CLAUDE.md.** 24 CLAUDE.md files form a nested context chain from the root down to individual sub-modules. Claude Code loads root + module + sub-module when working inside a folder — each level only documents what it owns. This scales with the project: adding a new workstream doesn't inflate the root.

**Hybrid persistence, picked per use-case.**
- **Supabase** for shared multi-user data (deals, fund returns, skill catalog, learning log, initiatives, org chart).
- **File-based JSON** (`data/*.json`) for infrequent writes owned by a single process (priorities, weekly reports, suggestions).
- **localStorage** for pure client UI state (quiz history, lab scratchpads, notes) — no server round-trip needed.
- **Dropbox / Notion** as source-of-truth for content that lives elsewhere organizationally.

**Single OAuth app serves both login and Gmail.** Supabase Auth's Google provider + Gmail API scopes captured in the same consent screen. One refresh token per user, persisted server-side, used by ACIO scan.

**Service-role-only data access.** API routes read/write via `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Auth is the gate at the middleware; inside the app, data is uniformly visible to all authenticated `@amitiscapital.com` users.

## Area map

| Area | Status | Owns | Reads from | Written by |
|---|---|---|---|---|
| `acio/deals` | In progress | `acio_deals`, `acio_deal_emails`, `acio_email_messages`, `acio_email_attachments`, `acio_deal_links`, `acio_scan_log`, `deal_notes` | Gmail (per-user) | Scan API + user UI |
| `acio/investment-memos` | Placeholder | — | `acio_deals` (planned) | — |
| `investor-relations/marketing-collaterals` | Active | — (Dropbox-backed) + `collaterals_*` tables | Dropbox | Dropbox sync job |
| `investor-relations/{one-pagers,newsletters,x-posts}` | Placeholder | — | — | — |
| `operations/enablement` | Active | `learning_log`, `suggestions` (file), `weekly_reports` (file) + localStorage for quiz/lab/notes | Supabase Storage (screenshots) | User UI, Python scripts |
| `operations/ai-initiatives` | Active | `ai_initiatives` | — | User UI |
| `operations/organization` | Active | `org_people`, `org_tech_stack`, `org_responsibilities`, `org_responsibility_assignments`, `org_notion_pages`, `org_notion_access` | Notion API | Sync API + user UI |
| `oig/_schema` | Active | `organizations`, `people`, `interactions`, `action_items`, `interaction_tags`, `action_item_tags`, `audit_findings` (+ pgvector) | — | Database Engineer migrations |
| `oig/cos` | Active | — (reads OIG tables) | Gmail (per-user, drill+draft only), Anthropic | User UI (chat) |
| `oig/triage` | Active (Gmail only) | (sole writer of OIG memory tables) | Gmail/Slack/Attio/Tactiq, Anthropic | On-demand button + future cron |
| `portfolio/fund-returns` | Active | `fund_returns` + `fund-return-audits` storage bucket | Flask dashboard (iframe), Portfolio Model (out-of-band) | Cron |
| `portfolio/fund-accounting` | Scoping | `funds`, `fund_allocations`, `reconciliation_log` | — | — |
| `priorities` | Active | `data/priorities.json` | Gmail + Attio (Python) | `scripts/refresh-priorities.py` |
| `priorities/gage` | Active | `gage_screenshots` + `gage-screenshots` storage bucket | Tesseract OCR | User UI |
| `research` | Placeholder | — | — | — |
| `skills` | Active | `skill_catalog`, `skill_evals`, `skill_versions`, `skill_proposals`, `skills`, `skill_usage` | `~/.claude/skills/` filesystem (via `sync-skills.py`) | Approval API + user UI |
| Auth (cross-cutting) | Active | `user_profiles`, `user_gmail_credentials`, `audit_log` | Google OAuth | `/auth/callback` + `handle_new_user` trigger |

## Context chain

**Root**
- `CLAUDE.md` — architecture, commands, data layer overview, auth, env vars, deployment, conventions

**Module-level** (one per top-level workstream parent + each sub-module)
- `src/app/acio/CLAUDE.md` — parent; redirects
- `src/app/acio/deals/CLAUDE.md` — deal pipeline, Gmail integration, dedup, scan
- `src/app/acio/investment-memos/CLAUDE.md` — placeholder
- `src/app/investor-relations/CLAUDE.md` — parent; redirects
- `src/app/investor-relations/one-pagers/CLAUDE.md` — placeholder
- `src/app/investor-relations/newsletters/CLAUDE.md` — placeholder
- `src/app/investor-relations/x-posts/CLAUDE.md` — placeholder
- `src/app/investor-relations/marketing-collaterals/CLAUDE.md` — Dropbox grid + org chart canvas
- `src/app/operations/CLAUDE.md` — parent
- `src/app/operations/enablement/CLAUDE.md` — tabbed hub
- `src/app/operations/enablement/quiz/CLAUDE.md` — daily quiz
- `src/app/operations/enablement/lab/CLAUDE.md` — architecture + systems labs
- `src/app/operations/enablement/learning-log/CLAUDE.md` — markdown KB + screenshots
- `src/app/operations/ai-initiatives/CLAUDE.md` — initiative tracker
- `src/app/operations/organization/CLAUDE.md` — org chart + Notion audit
- `src/app/oig/CLAUDE.md` — Operations Intelligence Engine architecture overview, phase status
- `src/app/oig/_schema/CLAUDE.md` — Database Engineer invariants and rules for evolving the OIG schema
- `src/app/oig/cos/CLAUDE.md` — Chief of Staff agent (reads OIG memory; limited source access for drill+draft)
- `src/app/oig/triage/CLAUDE.md` — Triage agent (sole ingestor; reads sources, writes OIG)
- `src/app/portfolio/CLAUDE.md` — parent
- `src/app/portfolio/fund-returns/CLAUDE.md` — pipeline detail, confidence hierarchy
- `src/app/portfolio/fund-accounting/CLAUDE.md` — scoping notes
- `src/app/priorities/CLAUDE.md` — Kanban + cron refresh
- `src/app/priorities/gage/CLAUDE.md` — screenshot OCR
- `src/app/research/CLAUDE.md` — placeholder
- `src/app/skills/CLAUDE.md` — marketplace + dev pipeline
- `src/app/skills/admin/system-directory/CLAUDE.md` — read-only directory scan

No `.claude/rules/` files in this project (root-level rules live in `~/.claude/rules/`).

## Data ownership

**Supabase tables → owning area**
- `funds`, `fund_returns`, `fund_allocations`, `reconciliation_log` → `portfolio/`
- `acio_deals`, `acio_deal_emails`, `acio_email_messages`, `acio_email_attachments`, `acio_deal_links`, `acio_scan_log`, `deal_notes` → `acio/deals`
- `learning_log` → `operations/enablement/learning-log`
- `ai_initiatives` → `operations/ai-initiatives`
- `org_people`, `org_tech_stack`, `org_responsibilities`, `org_responsibility_assignments`, `org_notion_pages`, `org_notion_access` → `operations/organization`
- `agent_permissions`, `agent_memory`, `agent_conversations`, `agent_messages` → `oig/_shared` (cross-agent platform tables)
- `organizations`, `people`, `interactions`, `action_items`, `interaction_tags`, `action_item_tags`, `audit_findings` → `oig/_schema` (Triage writes; COS and Audit read)
- `skill_catalog`, `skill_evals`, `skill_versions`, `skill_proposals`, `skills`, `skill_usage` → `skills/`
- `gage_screenshots` → `priorities/gage`
- `user_profiles`, `user_gmail_credentials`, `audit_log` → cross-cutting auth (`middleware.ts`, `auth/callback`)

**Storage buckets**
- `fund-return-audits` → `portfolio/fund-returns`
- `learning-log-screenshots` → `operations/enablement/learning-log`
- `gage-screenshots` → `priorities/gage`

**File-based stores (`data/`)**
- `data/priorities.json` → `priorities/` (written by `scripts/refresh-priorities.py`)
- `data/suggestions.json` → `operations/enablement` (written by `scripts/log-suggestion.py`)
- `data/weekly-reports.json` → `operations/enablement` (written by `scripts/compile-weekly-report.py`)

**External sources**
- Gmail (per-user, via `user_gmail_credentials`) → `acio/deals` scan
- Gmail (legacy, via `GMAIL_REFRESH_TOKEN` env) → Python scripts only
- Notion → `operations/organization` audit
- Dropbox → `investor-relations/marketing-collaterals`
- Portfolio Model (Excel, out-of-band) → truth for `portfolio/fund-returns` reconciliation
