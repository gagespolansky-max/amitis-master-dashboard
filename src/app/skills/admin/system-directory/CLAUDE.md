# System Directory (Admin) — CLAUDE.md

Admin page for viewing all agents, skills, and CLAUDE.md files installed on the local machine. Lives under Skills Hub → Admin.

## Owns

- **page.tsx:** Page shell with Directory/Context Tree tabs
- **_components/:** system-directory-view, directory-entry-card, detail-panel, context-tree-view, ask-section, usage-section, content-preview, detail-accordion, context-tree-node, context-detail-panel
- **api/:** GET directory scan, GET usage stats, POST ask, GET content, GET context-tree

## Status

Active.

## Connections

- Reads filesystem for agent/skill `.md` files and CLAUDE.md files
- Reads Supabase `skill_catalog` for hub status (read-only)
- Reads Supabase `skill_usage` for usage stats (read-only)
- Calls Anthropic API (Sonnet) for Ask feature
- No owned tables — purely a read/display layer
