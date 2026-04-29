# X Posts — CLAUDE.md

X-post drafting agent. Paste a source (tweet URL/text/article/topic) + a one-sentence angle → returns 2-3 voice-matched drafts in Chris Solarz's voice.

## Owns

- **page.tsx** — Page wrapper, renders DraftForm
- **api/draft/route.ts** — POST endpoint (`/investor-relations/x-posts/api/draft`); calls Anthropic with the chris-voice skill assets as system prompt
- **_lib/agent.ts** — Loads skill files at module init, builds the system prompt, dispatches to Claude. Single entry: `generateDrafts({source, angle}, client) → {drafts, model, duration_ms}`
- **_lib/skills/chris-voice/voice-guide.md** — Drafting rules (tone, formats, hooks, closers, hard rules)
- **_lib/skills/chris-voice/exemplars.md** — 27 curated few-shot examples across 8 structural formats
- **_components/draft-form.tsx** — Client form: source textarea + angle textarea + button + results pre-block + copy button

## Status

v0 shipped. Single-skill agent (chris-voice). The agent is designed to grow: future skills can live under `_lib/skills/` (e.g., `topic-finder`, `draft-scorer`, `scheduler`) and be orchestrated from `_lib/agent.ts`.

## Skill source-of-truth

The canonical chris-voice skill lives at `~/.claude/skills/chris-voice/` (also usable from raw Claude Code sessions). The .md files here are a build-time copy. **When the global skill is tightened, manually re-sync `voice-guide.md` and `exemplars.md` into this module's `_lib/skills/chris-voice/`** before deploy. A small sync script can be added later if churn justifies it.

The canonical skill also carries the full corpus (`corpus.jsonl`, 956 posts with sources extracted) and deeper analyses under `_analysis/` — those are not duplicated here because the dashboard runtime doesn't need them.

## Connections

- **Anthropic API** (claude-sonnet-4-6) — single-shot messages.create with system prompt = voice-guide + exemplars + output contract
- **Skill assets** — duplicated from `~/.claude/skills/chris-voice/`; manual re-sync on iterations
- **No Supabase tables yet.** Likely v1 candidates: `x_post_drafts` (saved generations + which variant Chris picked, for future voice-tuning), `x_posts` (published log with engagement)

## Hard rules baked into the system prompt

- Never fabricate sources, URLs, research firms, or attributed quotes
- Never make a price prediction in Chris's own voice (only attribute to others — VanEck, Standard Chartered, etc.)
- No emojis, hashtags, degen language, partisan politics, or fund self-promotion
