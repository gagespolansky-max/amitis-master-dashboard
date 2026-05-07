CLAUDE.md — Amitis Master Dashboard
This file provides guidance to Claude Code when working in this repository. Personal context and communication preferences are in the global ~/.claude/CLAUDE.md.
Critical: Next.js 16.2.1
This project runs Next.js 16.2.1 — APIs, conventions, and file structure differ from earlier versions. Always read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices.
Commands

npm run dev — Start dev server (http://localhost:3000)
npm run build — Production build
npm run lint — ESLint (runs eslint with flat config)
npm run start — Serve production build

Python scripts (run from project root)

python scripts/log-suggestion.py "<type>" "<title>" "<description>" — Log enablement suggestion (type: Skill, Workflow, Automation, Feature)
python scripts/refresh-priorities.py — Pull from Gmail + Attio, rank via Claude, write to data/priorities.json
python scripts/compile-weekly-report.py — Aggregate week's suggestions into data/weekly-reports.json
python scripts/sync-skills.py — Scan ~/.claude/skills/ and ~/.claude/plugins/, create Supabase submissions for admin approval
python scripts/index_fund_docs.py --fund <slug> --source-provider dropbox — Fund Doc Search indexer; indexes Dropbox fund docs into Supabase pgvector
python scripts/index_fund_batch.py --funds all --source-provider dropbox — Batch Fund Doc Search indexer over the 16 allocated fund manifest
python scripts/query_funds.py --fund <slug> --question "<question>" — Fund Doc Search query CLI with cited answers

Global Claude Code skills (installed at ~/.claude/skills/, available across all projects)

learning-log — Captures technical concepts to Supabase learning_log table when concepts are explained during sessions
project-docs-updater — Generates CLAUDE.md update blocks when meaningful architecture changes happen
skill-analytics — Logs skill usage events, reports on usage stats, and syncs new/modified skills to skill_proposals for admin approval (Mode 3). NEVER writes directly to skill_catalog.

Project agents

Project agent registry lives in `agents/README.md`. Fund Doc Search indexing is owned by the Fund Indexer Agent at `agents/fund-indexer/PERSONA.md`, with runtime pointers for Claude, Cursor, and Codex. Keep agent topology there; keep this root file as a short pointer only.

Architecture
Next.js App Router with a sidebar-driven layout. All pages live under src/app/. Path alias: @/* → src/*.
Module structure: Each module colocates its own _components/, _lib/, and api/ directories. Shared components (sidebar, page-header, placeholder-card, doodle-pad) stay in src/components/. Shared lib (supabase.ts, supabase-server.ts) stays in src/lib/. Each module has its own CLAUDE.md — see those for module-specific context.
Data layer
Four persistence patterns coexist:

File-based JSON (data/) — Priorities, suggestions, weekly reports. API routes do read/write against these files.
Browser localStorage — Quiz history, learner profile, lab history, notes, scenario history. Client components own this state.
External APIs — Claude (Anthropic SDK, Sonnet 4) for quiz generation, lab challenges, grading, and workflow building. Gmail + Attio via Python scripts.
Supabase (PostgreSQL) — Platform database for all structured data. Project: Amitis Master Dashboard (https://njmqygpadjqlnbinblun.supabase.co).
Fund returns cluster (active):

funds — Master list of funds + share classes, maps to Portfolio Model rows. Seeded with 13 funds.
fund_returns — Every extracted return figure. Has confidence hierarchy (1=MTD, 2=EOM, 3=investor_statement). Auto-trigger sets is_current on insert — highest confidence wins, then most recent. Investor statements are always confidence 3 and always net.
fund_allocations — Which funds are in which portfolios (flagship, mn_btc, mn_usd).
reconciliation_log — Compares Pipeline 1 (Portfolio Model) vs Pipeline 2 (dashboard) values. Powers green/red dot.

Fund Doc Search cluster:

fund_managers — One row per external fund manager; legal-name metadata for fund-doc search.
fund_documents — One row per indexed source file; Dropbox filepath, doc_type, hash, authoritative-format flag, soft-delete state.
fund_document_chunks — pgvector-backed chunks with generic citation locators and embedding_model.
Local runtime log: data/fund_indexing_log.db (ignored by git). Batch source-root manifest: agents/fund-indexer/fund-source-roots.json. OIG consumes this through shared fund-doc-search rather than direct Dropbox access. Python deps install from requirements-fund-doc-search.txt.

Skills Hub cluster (active):

skill_catalog — Marketplace entries with full SKILL.md content, Amitis fit assessment, workflow mapping. Skills enter here ONLY through the approval API.
skill_evals — Eval results aligned to skill-creator benchmark.json format.
skill_versions — Version history tracking.
skill_proposals — Development pipeline + submission approval. Has type (idea/submission), submitted_skill_md, approval fields. New skills go through admin approval before appearing in marketplace.
ai_initiatives — Initiative tracker with status progression (idea → scoping → in_progress → testing → shipped).

ACIO cluster (tables ready, not yet populated):

acio_deals — Investment pipeline — under_review, invested, passed.
deal_notes — Memos, updates, diligence attached to deals.

Operations cluster (active):

learning_log — Technical concepts explained during work sessions. Category-indexed.
skills — Master list of all skills across projects. Has columns: scope, environments, is_active, category, current_version_id, marketplace_source.
skill_usage — Every skill trigger event with outcome tracking.

Views: best_available_returns (best return per fund per month with confidence label), skill_usage_summary (usage stats per skill with 7d/30d rollups).

Skill approval pipeline
New/modified skills NEVER write directly to skill_catalog. The flow is:

Skill created/modified on Cowork, Claude Code, or Claude.ai
skill-analytics (Mode 3) or sync-skills.py writes to skill_proposals with type='submission', status='pending_review'
Admin reviews in Skills Hub Development tab → approves or rejects
Approved skills move to skill_catalog via POST /skills/api/approve

Fund returns pipeline — two parallel paths
Pipeline 1 (truth, Cowork fund-returns skill): Gmail → extract → Portfolio Model → 01 ACDAM Net Returns Internal → One-Pagers + Master Comps → Performance Newsletter. Pipeline 2 (display only, Flask): Gmail → Notion → fund-returns-dashboard (port 5050), iframed at /portfolio/fund-returns. Reconciliation dot on dashboard compares Pipeline 2 vs Pipeline 1.

See `src/app/portfolio/fund-returns/CLAUDE.md` for pipeline detail, confidence hierarchy, and reporting edge cases.

Page/workstream map
RouteStatusWhat it does/ActiveDashboard overview + priority board/prioritiesActiveAI-ranked Kanban (drag-drop via @hello-pangea/dnd)/skillsActiveSkills Hub — Skills In Use, Marketplace (deep detail + embedded Claude), Development (submissions + proposals), Eval History/portfolio/fund-returnsActiveNative page. Daily cron extracts returns to Supabase, user verifies here./operations/enablementActiveTabbed: Daily Quiz, Architecture Lab, Notes, Weekly Reports/operations/ai-initiativesActiveAI initiative tracker — clickable cards with detail views, status progression, linked skills/operations/enablement/learning-logActiveBrowse technical concepts captured during work sessions (reads Supabase learning_log). Rich markdown KB + screenshot dropzone + Ask Claude.
/operations/organizationActiveOrg chart (draggable cards, React Flow), responsibilities matrix, Notion access audit. Owns 6 `org_*` Supabase tables./portfolio/fund-accountingScopingSupabase schema designed, tables created. Next: wire dashboard to read from Supabase, build reconciliation dot./investor-relations/one-pagersComing soonGenerate and update investor-facing single-page fund summaries/investor-relations/newslettersComing soonMarket commentary and performance newsletters for LP distribution/investor-relations/x-postsComing soonSocial media content scheduling for X (Twitter)/researchComing soonFund vetting, deal evaluation/acio/dealsIn progressDeal pipeline — sourced through committed stages. Colocated _components/, _lib/, api/./acio/investment-memosComing soonAI-assisted investment memo drafting and library
Shared components (src/components/)

sidebar.tsx — Main navigation with expandable groups, active-state tracking
page-header.tsx — Reusable page header with title, description, status badge
placeholder-card.tsx — "Coming soon" placeholder
doodle-pad.tsx — Draggable floating notepad with topic tagging, localStorage

Auth & access

Google SSO via Supabase Auth, restricted to @amitiscapital.com via (a) Google Workspace OAuth app Internal type and (b) server-side email check in `/auth/callback`. Single OAuth flow captures Gmail scopes (`gmail.readonly`, `gmail.modify`) in the same consent step as login — refresh token persisted to `user_gmail_credentials` (service-role only; RLS blocks user reads) via the callback route. All routes guarded by `src/middleware.ts` except `/login` and `/auth/callback`. Service role continues to serve shared data (no per-user RLS on deals etc.) — auth is the gate, data is uniformly visible. Use `requireUser()` from `src/lib/auth.ts` in API routes. Get a Gmail client with `getGmailClientForUser(userId)` from `src/app/acio/deals/_lib/gmail.ts`.

Python scripts (`scripts/refresh-priorities.py`) still use the legacy `GMAIL_REFRESH_TOKEN` env var for Gage's personal inbox — deferred migration, not in scope for the SSO rollout.

Environment variables

Required (set locally in `.env.local` and on Vercel):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase config
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` — Google OAuth app credentials (same app serves both Supabase Auth login and Gmail API access)
- `GMAIL_ACIO_LABEL_ID` — Gmail label ID for ACIO-Opportunities scan mode
- `ANTHROPIC_API_KEY` — Claude API
- `OPENAI_API_KEY` — Fund Doc Search embeddings
- `NOTION_ORG_API_KEY` — org module Notion audit
- `DROPBOX_*` — marketing collaterals (access, refresh, app key/secret, folder, namespace)
- `ACIO_URL` — (dev only) internal ACIO service

Legacy, local-only (do not set on Vercel):
- `GMAIL_REFRESH_TOKEN`, `GMAIL_USER_EMAIL` — used by Python scripts against Gage's inbox. Web app uses per-user tokens from `user_gmail_credentials`.

Deployment

Vercel production. Custom domain via DNS CNAME to `cname.vercel-dns.com`. First-deploy checklist:
1. Run `supabase-auth-migration.sql` in Supabase SQL editor.
2. Configure Google OAuth (Internal user type, Gmail API enabled, redirect URI `https://<supabase-project>.supabase.co/auth/v1/callback`).
3. Configure Supabase Auth → Google provider with Gmail scopes and Site URL / Redirect URLs.
4. Set Vercel env vars.
5. Sign in once, verify `user_gmail_credentials` row exists, run an ACIO scan.
6. Remove `GMAIL_REFRESH_TOKEN` / `GMAIL_USER_EMAIL` from Vercel (Python scripts stay local).

External dependencies

Fund Returns Dashboard — Separate Flask app (~/fund-return-dashboard/) on port 5050, iframed into portfolio section. Has its own Notion integration for storing extracted fund returns.
Supabase — PostgreSQL database at https://njmqygpadjqlnbinblun.supabase.co. Primary data store for fund returns, ACIO deals, learning log, skill analytics, and Skills Hub. Connection via @supabase/supabase-js (client at src/lib/supabase.ts). Free tier, Amitis Capital Supabase org.
Skill Sync Pipeline — skill-analytics skill (Mode 3) detects new/modified skills across Cowork/Claude Code/Claude.ai, writes to skill_proposals for admin approval. Batch scan via python scripts/sync-skills.py. Approved skills move to skill_catalog.
Gmail API — per-user OAuth via Supabase Auth (`user_gmail_credentials`). Python scripts (legacy) still use a single `GMAIL_REFRESH_TOKEN`.
Attio CRM — API key for pulling tasks and notes into the priority system
Anthropic API — Powers all AI features via @anthropic-ai/sdk

Stack

Next.js 16.2.1, React 19, TypeScript 5
Tailwind CSS 4 (uses @theme directive in globals.css for CSS variables)
Dark theme throughout (background: #0f1117, accent: #6366f1)
Geist Sans + Geist Mono fonts (from next/font)
Python scripts use their own venv (venv/) with anthropic, google-auth, requests
Supabase (PostgreSQL) for structured data persistence

Conventions

"Coming soon" pages use the PlaceholderCard component
New workstreams get a sidebar entry in sidebar.tsx and a route under src/app/
New modules colocate api/, _components/, and _lib/ inside their app directory with a CLAUDE.md
API routes live inside each module (e.g., /skills/api/approve, /operations/enablement/lab/api/generate)
When making enablement suggestions during sessions, also call log-suggestion.py so they persist to the dashboard
When explaining technical concepts, offer to log them via the learning-log skill
After meaningful architecture changes, generate a docs update block via the project-docs-updater skill
Skills NEVER write directly to skill_catalog — they go through skill_proposals for admin approval first
