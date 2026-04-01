# Investor Relations — CLAUDE.md

Parent module for LP-facing communications and materials. page.tsx redirects to /investor-relations/one-pagers.

## Owns

- **page.tsx:** Redirect only
- **Children:** one-pagers/, newsletters/, x-posts/ (each has own CLAUDE.md)

## Status

Coming soon.

## Connections

- One-pagers consume data from the fund returns pipeline (Pipeline 1 → Portfolio Model → One-Pagers)
- Newsletters package one-pagers for distribution via Mailchimp
- X posts will schedule social content from market commentary
- No owned tables, components, or API routes — purely organizational
