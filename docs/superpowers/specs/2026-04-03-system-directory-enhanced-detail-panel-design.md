# System Directory Enhanced Detail Panel + Context Tree — Design Spec

Enhances the system directory page with: Ask (AI Q&A), Usage stats, Content Preview in the detail panel, plus a new Context Tree tab showing all CLAUDE.md files as an interactive tree.

## Page-Level Tabs

Two tabs below the page header:

- **Directory** — existing split view (agents / skills / detail panel)
- **Context Tree** — CLAUDE.md tree visualization

Tab bar: simple text tabs, indigo underline for active. Switching tabs swaps the entire content area below.

## Enhanced Detail Panel (Directory Tab)

The existing detail panel keeps its Overview section unchanged (name, scope, description, owns, uses, used by, hub status, file path). Below Overview, three expandable accordion sections. All start collapsed. Multiple can be open simultaneously.

### Accordion: Ask

- Text input with send button
- Sends question + full file content of selected entry to Claude Sonnet
- Returns 2-3 sentence answer, displayed below the input
- No conversation history — each question is independent, fresh context every time
- If the question references another entry by `/name`, automatically include that entry's file content in the prompt
- Loading state: "Thinking..." with disabled input while waiting

**API:** `POST /skills/admin/system-directory/api/ask`

```typescript
// Request
{ question: string, entryName: string, fileContent: string, relatedContent?: { name: string, content: string }[] }

// Response
{ answer: string }
```

System prompt: "You are explaining agents and skills in Gage's Claude Code setup. Answer concisely (2-3 sentences). You have the full file content for context. Be specific, not generic."

Model: `claude-sonnet-4-20250514`, max_tokens: 500

### Accordion: Usage

- Pulls from Supabase `skill_usage` table for the selected entry
- Displays:
  - **Total invocations** — count
  - **Success rate** — percentage, color-coded (green 80%+, yellow 50-79%, red <50%)
  - **Last used** — relative date ("3 days ago")
  - **Recent invocations** — table of last 10: date, outcome badge (success/partial/failure), notes
- Outcome badges follow existing Skills Hub color conventions:
  - Success: green checkmark, `rgba(34,197,94,0.12)` bg
  - Partial: yellow warning, `rgba(234,179,8,0.12)` bg
  - Failure: red X, `rgba(239,68,68,0.12)` bg
- **Empty state:** "Run `/skill-analytics` after using this skill to start tracking"

**API:** `GET /skills/admin/system-directory/api/usage?name=<entry-name>`

```typescript
// Response
{
  totalUses: number
  successCount: number
  failureCount: number
  lastUsed: string | null       // ISO date
  recentInvocations: {
    id: string
    timestamp: string
    outcome: string
    notes: string
    project: string
  }[]
}
```

### Accordion: Content Preview

- Renders the raw markdown content of the SKILL.md or command `.md` file
- Scrollable container, monospace font, max-height ~400px
- No additional API call — uses `fileContent` already available from the directory scan (requires enhancing the existing API to optionally return full content)
- Collapsed by default

**Change to existing API:** Add `?includeContent=true` query param to `GET /skills/admin/system-directory/api`. When present, each entry also includes `fileContent: string` with the full file text. Default behavior (without param) stays the same to keep the main page load fast. The client fetches with `includeContent=true` only when a user expands the Content Preview accordion for the first time.

Alternative: fetch content on-demand per entry. Simpler — just read the file by path when the accordion opens. This avoids loading all 21 files upfront.

**Decision: on-demand.** New endpoint:

`GET /skills/admin/system-directory/api/content?path=<absolute-file-path>`

Returns `{ content: string }`. Validates the path ends in `.md` and lives under `~/.claude/` or `~/<project>/.claude/` to prevent arbitrary file reads.

## Context Tree (New Tab)

### Data Source

**API:** `GET /skills/admin/system-directory/api/context-tree`

Walks the filesystem:
1. `~/.claude/CLAUDE.md` — global instructions
2. `~/.claude/rules/*.md` — global rules
3. For each discovered project (same discovery logic as directory scanner):
   - Recursively find all `CLAUDE.md` files
   - Recursively find all `.claude/rules/*.md` files
4. Cross-reference with directory entries to show which agents/skills live at each level

```typescript
interface ContextNode {
  filePath: string
  shortPath: string          // e.g. "skills/CLAUDE.md"
  summary: string            // first paragraph of the file, truncated ~120 chars
  project: string | "global"
  depth: number              // nesting level
  children: ContextNode[]    // child CLAUDE.md files
  agents: string[]           // agent names at this level
  skills: string[]           // skill names at this level
  rules: string[]            // .claude/rules/*.md file names at this level
}
```

### Tree Layout

- **Top node:** `~/.claude/CLAUDE.md` (global)
  - Below it: `~/.claude/rules/` entries as leaf nodes
- **Project branches:** Each project with CLAUDE.md files
  - Root: `<project>/CLAUDE.md`
  - Left branch down: child CLAUDE.md files (nested modules)
  - Right branch down: agents and skills at that level
  - Children recurse the same pattern

### Tree Node Visual

Each node is a small card showing:
- Short file path (e.g. `operations/enablement/CLAUDE.md`)
- One-line summary parsed from first paragraph
- Small count badges: "3 children", "2 skills"

### Interaction

- Click any CLAUDE.md node → side panel opens on the right (same 30% width as directory detail panel)
- Side panel shows:
  - Full file path
  - Full rendered content of the CLAUDE.md file (scrollable, monospace)
  - List of child CLAUDE.md files at the next level
  - List of agents/skills that live at this level (clickable — switches to Directory tab and selects that entry)
- Selected node gets indigo border highlight (same pattern as directory)
- Tree is scrollable horizontally and vertically for deep nesting

### Visual Style

- Indented tree with thin connecting lines (CSS borders, not SVG)
- Dark theme consistent with rest of dashboard
- Nodes are compact cards (~40px height for collapsed, expand on select)
- Connecting lines: `var(--card-border)` color

## Module CLAUDE.md

Create `src/app/skills/admin/system-directory/CLAUDE.md`:

```markdown
# System Directory (Admin) — CLAUDE.md

Admin page for viewing all agents, skills, and CLAUDE.md files installed on the local machine. Lives under Skills Hub → Admin.

## Owns

- **page.tsx:** Page shell with Directory/Context Tree tabs
- **_components/:** system-directory-view, directory-entry-card, detail-panel, context-tree-view
- **api/:** GET directory scan, GET usage stats, POST ask, GET content, GET context-tree

## Status

Active.

## Connections

- Reads filesystem for agent/skill `.md` files and CLAUDE.md files
- Reads Supabase `skill_catalog` for hub status (read-only)
- Reads Supabase `skill_usage` for usage stats (read-only)
- Calls Anthropic API (Sonnet) for Ask feature
- No owned tables — purely a read/display layer
```

## New Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `api/ask/route.ts` | Create | POST — AI Q&A about selected entry |
| `api/usage/route.ts` | Create | GET — usage stats from skill_usage |
| `api/content/route.ts` | Create | GET — raw file content by path |
| `api/context-tree/route.ts` | Create | GET — CLAUDE.md tree structure |
| `_components/detail-accordion.tsx` | Create | Expandable accordion wrapper |
| `_components/ask-section.tsx` | Create | Ask input + answer display |
| `_components/usage-section.tsx` | Create | Usage stats + invocation table |
| `_components/content-preview.tsx` | Create | Raw markdown viewer |
| `_components/context-tree-view.tsx` | Create | Tree visualization + side panel |
| `_components/context-tree-node.tsx` | Create | Individual tree node card |
| `_components/context-detail-panel.tsx` | Create | Side panel for selected CLAUDE.md |
| `page.tsx` | Modify | Add tab bar, conditionally render Directory or Context Tree |
| `_components/detail-panel.tsx` | Modify | Add accordion sections below overview |
| `CLAUDE.md` | Create | Module documentation |

## Color Conventions (reused from Skills Hub)

| Element | Color |
|---------|-------|
| Success rate 80%+ | `var(--success)` green |
| Success rate 50-79% | `var(--warning)` amber |
| Success rate <50% | `#ef4444` red |
| Success outcome badge | `rgba(34,197,94,0.12)` bg, green text |
| Partial outcome badge | `rgba(234,179,8,0.12)` bg, amber text |
| Failure outcome badge | `rgba(239,68,68,0.12)` bg, red text |
| Active tab underline | `var(--accent)` indigo |
| Selected tree node | `border-accent bg-accent/5` |
