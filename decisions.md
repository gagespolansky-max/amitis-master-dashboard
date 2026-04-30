# Decisions

Tracks deferred or non-obvious architectural choices for the dashboard. Lightweight log — one entry per decision. Add date when revisited.

---

## Agents — no streaming for V1

**Decision (2026-04-28):** The agent chat endpoints (`email-drafter`, `chief-of-staff`) return the full agentic-loop result in a single JSON response after the loop completes. No SSE / streaming.

**Why:**
- Multi-iteration tool use makes streaming meaningfully harder — you'd stream tokens, then pause for tool execution, then resume. The Anthropic SDK supports this but the client UX needs to handle interleaved tool indicators correctly.
- Loops typically finish in 5–25 seconds. The chat shell shows a "thinking…" indicator and tool-use chips after the response arrives. Acceptable for V1.
- Building streaming up front would have delayed shipping.

**When to revisit:** if a single loop regularly takes > 30 seconds in real use, or if users complain about the lag. Switch to SSE with incremental message appending. The conversation persistence model is already compatible — each iteration is its own DB row.

---

## Agents — accept some duplication between agent modules

**Decision (2026-04-28):** Each agent (email-drafter, chief-of-staff) has its own `_components/chat-shell.tsx`, `_lib/anthropic.ts`, `api/chat/route.ts`. Only `_lib/persistence.ts` is shared at the agents/ level.

**Why:**
- Each agent's chat shell has a different right-pane (email-drafter has draft preview; chief-of-staff has the rendered brief). Trying to parameterize one shell over both adds props churn.
- Each agent's prompt + tool set is materially different. Shared loop helper would have a generic interface; concrete-per-agent is easier to read.
- Refactoring to share more once a third agent appears is a small change. Premature abstraction is worse.

**When to revisit:** when adding agent #3 (Investor Updates? Memo Drafter? something else). At that point, extract a shared `runAgenticLoop` helper.

---

## Agents — Slack OAuth deferred

**Decision (2026-04-28):** Chief of Staff ships with Gmail + Google Calendar only. Slack integration deferred.

**Why:**
- Slack OAuth is a separate per-user OAuth flow with its own token storage, refresh handling, and scope decisions. Estimated 3–4 days alone.
- Gage's day-to-day signal is heavily weighted toward Gmail; Slack value is uncertain.
- Better to ship without Slack and validate that COS adds value before investing in the integration.

**When to revisit:** after using COS daily for ~2 weeks. If brief quality feels limited by missing chat context, build the Slack integration as Phase 3.
