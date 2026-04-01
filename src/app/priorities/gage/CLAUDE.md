# Gage Priorities — CLAUDE.md

Screenshot-based personal priority capture. Drag-drop screenshots, OCR extracts text, editable cards with date and description.

## Owns

- **_components/:** gage-priorities.tsx, screenshot-dropzone.tsx, ocr-card.tsx
- **_lib/:** ocr.ts (Tesseract.js wrapper)
- **api/:** CRUD for gage_screenshots table

## Supabase table

- `gage_screenshots` — id, image_url, extracted_text, edited_text, description, date_label, created_at, updated_at, sort_order

## Status

Active.

## Connections

- Parent: /priorities (sidebar sub-tab)
- Uses Supabase Storage bucket `gage-screenshots` for image files
- Uses Tesseract.js for in-browser OCR (no server-side processing)
