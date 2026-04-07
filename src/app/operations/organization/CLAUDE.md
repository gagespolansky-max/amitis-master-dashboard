# Organization Module — CLAUDE.md

Interactive org chart, responsibilities matrix, and Notion workspace audit for the combined Amitis Capital + Samara Asset Management organization.

## Owns

- **Tables:** `org_people`, `org_tech_stack`, `org_responsibilities`, `org_responsibility_assignments`, `org_notion_pages`, `org_notion_access`
- **_components/:** org-tabs, org-chart, person-node, tech-stack-pills, external-providers, responsibilities-matrix, notion-modal, notion-audit-tab
- **_lib/:** types.ts
- **api/:** CRUD for people + tech stack, responsibilities CRUD, seed endpoint, Notion sync/audit/assign

## Features

- **Org Chart tab:** Tree view of the combined org. Expandable person cards show job description, responsibilities, and paid platform pills. Clicking "Notion" opens a slide-over with that person's assigned Notion pages.
- **Responsibilities tab:** Editable matrix. Rows = responsibility areas, columns = people. Click cells to cycle through owner/contributor/backup. Amber = overlap (2+ owners), red = gap (no owner).
- **Notion Audit tab:** Workspace reorganization tool. Sync from Notion API, assign page ownership, flag pages as keep/consolidate/archive. "By Person" view shows per-person deliverables.

## Status

Active.

## Connections

- Reads/writes Supabase for all org data
- Notion API integration via `NOTION_ORG_API_KEY` env var (read-only sync — separate integration from other modules for scoped permissions)
- No dependencies on other modules
