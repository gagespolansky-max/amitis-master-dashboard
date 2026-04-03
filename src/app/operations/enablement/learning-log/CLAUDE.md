# Learning Log — CLAUDE.md

Personal technical knowledge base. Rich markdown articles, screenshot extraction, category-grouped browsing, slide-over editor. Three entry points: Claude Code skill (auto-log), dashboard Ask Claude bar, and screenshot drop.

## Owns

- **page.tsx:** Standalone page rendering LearningLogTab
- **_components/learning-log-tab.tsx:** Main orchestrator — stats, Ask Claude, dropzone, filters, category sections, editor
- **_components/entry-card.tsx:** Expandable card with markdown rendering, source badges, delete confirmation
- **_components/category-section.tsx:** Groups entries under collapsible category headers with count
- **_components/entry-editor.tsx:** Slide-over panel with markdown preview toggle, dirty state tracking
- **_components/screenshot-dropzone.tsx:** Drag-and-drop zone with processing overlay
- **_components/markdown-renderer.tsx:** react-markdown + remark-gfm wrapper with dark theme styling
- **_lib/learning-log-types.ts:** Types, category/source constants, color maps
- **api/route.ts:** GET/PATCH/DELETE for learning_log entries (PATCH sets updated_at, DELETE cleans up storage)
- **api/explain/route.ts:** POST — sends concepts to Claude, returns rich markdown articles with content + explanation
- **api/screenshot/route.ts:** POST — FormData image → parallel Claude vision + Supabase Storage upload → insert entry
- **Supabase table:** `learning_log` (concept, explanation, content, context, category, source, image_url, tags, updated_at, created_at)
- **Supabase Storage bucket:** `learning-log-screenshots` (public read)

## Schema

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| concept | text | Short name |
| explanation | text | 2-4 sentence summary |
| content | text | Full markdown article (nullable) |
| context | text | Where learned (nullable) |
| category | text | databases, api, infrastructure, frontend, ai, devops, general |
| source | text | claude_code, dashboard, screenshot — CHECK constraint |
| image_url | text | Public URL from learning-log-screenshots bucket (nullable) |
| tags | text[] | Lowercase tag array |
| updated_at | timestamptz | Set on PATCH |
| created_at | timestamptz | Auto |

## Connections

- Reads/writes Supabase `learning_log` table via API routes
- Also rendered as a tab inside enablement-tabs.tsx (parent)
- Entries written by: (1) Claude Code learning-log skill, (2) dashboard Ask Claude, (3) screenshot drop
- Uses Anthropic SDK (claude-sonnet-4) for explanations and vision
- Uses shared `ai-parse.ts` for response parsing
- Uses `learning-log-screenshots` Supabase Storage bucket for screenshot images
- Dependencies: react-markdown, remark-gfm
