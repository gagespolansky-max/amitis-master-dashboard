# Marketing Collaterals — CLAUDE.md

Catalog page for investor-facing marketing materials. Mirrors a Dropbox folder in real time — any file added to the configured folder automatically appears as a card with a live thumbnail preview. Click-through opens the file in Dropbox.

## Owns

- **page.tsx:** Server component shell — renders PageHeader + CollateralsGrid
- **_components/collaterals-grid.tsx:** Client component — fetches folder contents from API, renders card grid with loading/error/empty states
- **_components/collateral-card.tsx:** Client component — thumbnail with fallback icon, title derived from filename, file type + modified date
- **api/folder/route.ts:** Lists Dropbox folder contents via `files/list_folder`, generates shared links via `sharing/create_shared_link_with_settings`. 5 min cache. Returns sorted by modified date (newest first).
- **api/thumbnail/route.ts:** Proxies Dropbox `get_thumbnail_v2` API. Returns cached PNG (24h).

## Status

Active.

## Environment

- `DROPBOX_ACCESS_TOKEN` — Long-lived Dropbox API token. Required scopes: `files.metadata.read`, `files.content.read`, `sharing.read`, `sharing.write`.
- `DROPBOX_COLLATERALS_FOLDER` — Dropbox path to the folder that serves as the collaterals catalog (e.g. `/Marketing Materials/Collaterals`).

## Connections

- Reads files from Dropbox (display only, never writes or deletes)
- Complements one-pagers and newsletters as part of the IR suite
- Future: migrate to Supabase catalog with team self-service UI
