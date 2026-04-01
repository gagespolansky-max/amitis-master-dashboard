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

Global Claude Code skills (installed at ~/.claude/skills/, available across all projects)

learning-log — Captures technical concepts to Supabase learning_log table when concepts are explained during sessions
project-docs-updater — Generates CLAUDE.md update blocks when meaningful architecture changes happen
skill-analytics — Logs skill usage events, reports on usage stats, and syncs new/modified skills to skill_proposals for admin approval (Mode 3). NEVER writes directly to skill_catalog.

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
Pipeline 1 (source of truth — Cowork fund-returns skill):
Gmail → extract returns → Portfolio Model (NAV_BTC + NAV_USD sheets) → 01 ACDAM Net Returns Internal (perf chart + VAMI chart) → branches to: Master Comps (net return → risk statistics) AND One-Pagers. Both 01 ACDAM Net Returns (perf chart, VAMI) and Master Comps (risk stats) feed into One-Pagers. One-Pagers → Performance Newsletter (Mailchimp — literally just the one-pagers packaged).
Pipeline 2 (display only — Flask dashboard):
Gmail → extract returns → Notion → fund-returns-dashboard (Flask, port 5050). Iframed into master dashboard at /portfolio/fund-returns.
Reconciliation: Green/red dot on dashboard compares Pipeline 2 values against Pipeline 1. Portfolio Model is the canonical source of truth. Dashboard reads but never writes.
Fund reporting is messy:

Returns come via: email body, PDF attachment, Telegram (Grandline), portal/Playwright (Eltican)
Report stages: MTD (irregular, could be weekly), EOM (month close), investor statement (final, always net, arrives 15–30+ days later)
Same fund may send gross one week and net the next
Confidence hierarchy: investor_statement (3) > eom (2) > mtd (1)

Page/workstream map
RouteStatusWhat it does/ActiveDashboard overview + priority board/prioritiesActiveAI-ranked Kanban (drag-drop via @hello-pangea/dnd)/skillsActiveSkills Hub — Skills In Use, Marketplace (deep detail + embedded Claude), Development (submissions + proposals), Eval History/portfolio/fund-returnsActiveIframes the separate fund-returns-dashboard (port 5050)/operations/enablementActiveTabbed: Daily Quiz, Architecture Lab, Notes, Weekly Reports/operations/ai-initiativesActiveAI initiative tracker — clickable cards with detail views, status progression, linked skills/portfolio/fund-accountingScopingSupabase schema designed, tables created. Next: wire dashboard to read from Supabase, build reconciliation dot./investor-relationsComing soonOne-pagers, newsletters, LP materials, X post scheduling/researchComing soonFund vetting, deal evaluation/acioIn progressACIO deal pipeline (under_review/invested/passed), investment memos. Fully colocated with _components/, _lib/, api/.
Shared components (src/components/)

sidebar.tsx — Main navigation with expandable groups, active-state tracking
page-header.tsx — Reusable page header with title, description, status badge
placeholder-card.tsx — "Coming soon" placeholder
doodle-pad.tsx — Draggable floating notepad with topic tagging, localStorage

External dependencies

Fund Returns Dashboard — Separate Flask app (~/fund-return-dashboard/) on port 5050, iframed into portfolio section. Has its own Notion integration for storing extracted fund returns.
Supabase — PostgreSQL database at https://njmqygpadjqlnbinblun.supabase.co. Primary data store for fund returns, ACIO deals, learning log, skill analytics, and Skills Hub. Connection via @supabase/supabase-js (client at src/lib/supabase.ts). Free tier, Amitis Capital Supabase org.
Skill Sync Pipeline — skill-analytics skill (Mode 3) detects new/modified skills across Cowork/Claude Code/Claude.ai, writes to skill_proposals for admin approval. Batch scan via python scripts/sync-skills.py. Approved skills move to skill_catalog.
Gmail API — OAuth2 credentials for reading emails (used by refresh-priorities.py and the fund returns pipeline)
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