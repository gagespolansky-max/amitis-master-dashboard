# Chief of Staff — CLAUDE.md

User-facing reader agent. Top layer of the OIG architecture: reads curated state from the OIG database (`interactions`, `action_items`, `audit_findings`) and turns it into a daily operating brief + next steps. Can drill into source systems (Gmail/Slack/Attio) for verification or follow-through (drafting), but never ingests.

## Hard rules

- **Reads OIG DB primarily** — `interactions`, `action_items`, `audit_findings`, plus calendar.
- **Does NOT write to OIG DB.** No `insert into action_items`, no `update interactions`. If COS spots a new commitment from a source it pulled, it tells the user and suggests running Triage.
- **Reads sources for limited reasons only:** drill-down (one specific thread for verification), follow-through (drafting a reply).
- **Writes sources for follow-through only:** Gmail draft creation. Never sends. Never makes changes that aren't drafts.
- **Status changes (mark done, etc.)** go through UI buttons that hit a separate API — not through the agent.

## Owns

- **page.tsx** — gated chat shell + (embedded) Triage panel
- **_components/chat-shell.tsx** — client conversation UI: sidebar of past conversations, transcript with markdown, send-on-⌘+Enter
- **_lib/cos-prompt.md** — canonical system prompt (source of truth — edit here, not in code)
- **_lib/anthropic.ts** — loads cos-prompt.md + COS tool schemas + model/iteration config
- **_lib/cos-tools.ts** — tool implementations + dispatcher (`executeCosTool`)
- **api/chat/route.ts** — POST: runs the agentic loop, persists to `agent_messages`
- **api/conversation/route.ts** — GET (list/load), DELETE

## Tools (Phase 4)

| Tool | Type | Purpose |
|---|---|---|
| `read_action_items` | DB read | Primary TODO source; filters status, owner_email, priority, due_before, overdue_only |
| `read_interactions` | DB read | Recent threads, meeting prep by org/person, threads-with-open-asks |
| `read_audit_findings` | DB read | Risk / drift / overdue / repeated blockers (Audit Agent will populate) |
| `gmail_get_thread` | Source drill | Pulls a single Gmail thread for verification or drafting |
| `create_gmail_draft` | Source write | Drafts only — never sends; threads correctly via In-Reply-To |
| `list_calendar_events` | Source read | Google Calendar (read-only); anchors daily brief + meeting prep |
| `read_briefing_preferences` / `write_briefing_preferences` | Memory | Durable user prefs in `agent_memory` (slug=`chief-of-staff`) |

Contacts tool is still pending — requires `contacts.readonly` scope and another re-auth.

## Connections

- Reads: `interactions`, `action_items`, `interaction_tags`, `action_item_tags`, `audit_findings`, `organizations`, `people` (all owned by `oig/_schema/`)
- Reuses: `oig/_shared/persistence.ts` for chat history; `oig/_shared/db.ts` `readActionItems` / `readInteractions` / `readAuditFindings`; per-user Gmail OAuth via `getGmailClientForUser` from `acio/deals/_lib/gmail.ts`
- Anthropic SDK (Sonnet 4) for the loop, MAX_LOOP_ITERATIONS=18, 290s deadline

## Status

Phase 4 shipped. Live at `/oig/cos`. Next planned tunings: action_items extraction confidence (lives in Triage), and Phase 12 (calendar + contacts).
