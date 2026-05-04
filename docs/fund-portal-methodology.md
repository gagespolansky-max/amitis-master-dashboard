# Fund Doc Search Methodology

Status: v0 implementation in progress for GrandLine.

## 1. Pipeline Overview

Fund Doc Search indexes one fund at a time from Dropbox into Supabase pgvector:

1. Discover files under Manager Materials, Portfolio - Subscriptions, and optional IC Materials.
2. Log every file decision to local SQLite at `data/fund_indexing_log.db`.
3. Exclude operational/sensitive noise by filename and default-exclude `side_letter` and `sub_agreement`.
4. Resolve duplicate PDF/DOCX pairs with doc-type-aware authority rules.
5. Extract text from PDF, DOCX, XLSX, and CSV.
6. Chunk uniformly at 600 tokens with 100-token overlap; tables stay together up to 4000 tokens.
7. Estimate OpenAI embedding cost and abort above `--max-cost-usd`.
8. Embed with `text-embedding-3-small`.
9. Atomically replace chunks for changed documents through `replace_fund_document_chunks`.
10. Query through `query_funds.py` with cited answers synthesized by Claude.

OIG agents consume this through shared Fund Doc Search, not by directly reading Dropbox.

## 2. Source Roots And Exclusions

GrandLine Dropbox defaults:

- Subscriptions: `/Amitis Capital - General/AC - Digital/ACDAM Portfolio/Portfolio - Subscriptions/GrandLine`
- Manager Materials: `/Amitis Capital - General/AC - Digital/Manager Materials/Grandline`
- IC Materials: `/Amitis Capital - General/AC - Digital/IC Materials/Grandline`

Use Dropbox-backed reads to avoid local Smart Sync placeholders:

```text
python scripts/index_fund_docs.py --fund grandline --source-provider dropbox --skip-legal-name-prompt
```

`--source-provider auto` uses Dropbox when `DROPBOX_MCP_TOKEN` is present; local mode remains available for fixtures and explicit filesystem roots. Override roots with `--source-root-subs`, `--source-root-mm`, and `--source-root-ic`.

Filename exclusions are matched against filename stem, case-insensitive:

```python
EXCLUSION_REGEX = re.compile(
    r"^(?:.*\bw-?9\b.*"
    r"|.*\bkyc\b.*"
    r"|.*\btax\b.*"
    r"|.*\bwire(?:[\s_-]?(?:instructions?|info))?\b.*"
    r"|.*\bform[\s_-]?adv\b.*"
    r"|~\$.*"
    r"|\.ds_store"
    r"|thumbs\.db)$",
    re.IGNORECASE,
)
```

Default doc-type exclusion:

```text
--exclude-doc-types side_letter,sub_agreement
```

To include those types after approval, pass:

```text
--exclude-doc-types ""
```

## 3. Doc-Type Heuristics

First regex match wins on lowercased filename stem:

```python
DOC_TYPE_PATTERNS = [
    (r"(?:^|[^a-z0-9])ppm(?:$|[^a-z0-9])|private\s*placement\s*memorand|offering\s*memorand", "ppm"),
    (r"(?:^|[^a-z0-9])ddq(?:$|[^a-z0-9])|due\s*diligence\s*question", "ddq"),
    (r"factsheet|fact\s*sheet|\btearsheet\b|tear\s*sheet|one\s*pager|onepager", "factsheet"),
    (r"gross\s*return|net\s*returns?|daily\s*gross|pnl\s*daily|risk\s*contr[io]bution", "factsheet"),
    (r"fund\s*exposure|exposure", "exposure_report"),
    (r"reduced\s*fees?|fee\s*(calc|model)|fees?\s*calc", "fee_model"),
    (r"certificate\s*of\s*(change|incorporation)|incorporation", "corporate_doc"),
    (r"fund\s*structure|structure\s*chart", "structure_chart"),
    (r"\bic\s*report\b|investment\s*committee", "ic_report"),
    (r"\bodd\s*report\b|operational\s*due\s*diligence", "odd_report"),
    (r"monthly\s*(letter|update|commentary)|quarterly\s*(letter|update|commentary)|^[a-z]+\s*\d{4}\s*(letter|update)$", "letter"),
    (r"audited|audit\s*report|\bfinancials?\b.*\d{4}", "audited_fs"),
    (r"side\s*letter", "side_letter"),
    (r"(sub|subscription)\s*(agreement|docs?|booklet|document)|payment\s*agreement", "sub_agreement"),
    (r"deck|pitch|investor\s*deck|presentation", "deck"),
    (r"(?:^|[^a-z0-9])lpa(?:$|[^a-z0-9])|limited\s*partnership\s*agreement", "lpa"),
    (r"\boperating\s*agreement\b|\bllc\s*agreement\b", "operating_agreement"),
]
```

Fallback is `other`. Acceptance target: at least 80% of indexed files classify to non-`other`.

## 4. Extraction And Locators

Supported formats:

- PDF: `pdfplumber`; page text plus extracted tables.
- DOCX: `python-docx`; paragraphs by heading-style section plus tables.
- XLSX: `openpyxl`; row-preserving table serialization with sheet/row locators.
- CSV: Python `csv`; 200-row groups with header preserved.

Unsupported files are logged as `skipped_unsupported_extension`. Scanned PDFs with no extractable text are logged as `failed` with `no_extractable_text`; v0 does not OCR.

Locator semantics:

- PDF: `page`, e.g. `7` or `7-9`.
- DOCX: `section`, e.g. `Risk Factors`, with paragraph fallback.
- XLSX: `sheet_row`, e.g. `Returns:row_3-row_24`.
- CSV: `row_range`, e.g. `row_1-row_200`.
- Table chunks may use `table` when a more specific table locator is available.

## 5. Chunking

v0 uses uniform chunking:

- Narrative text: 600 tokens, 100-token overlap.
- Boundary preference: paragraph break, sentence punctuation, then hard token boundary.
- Table chunks: one chunk up to 4000 tokens; if larger, split by row groups while preserving the header row.

Deferred to v1: font-size header detection, all-caps header detection, and doc-type-conditional chunking.

## 6. Legal-Name Extraction

v0 extracts only:

```json
{
  "legal_name": "string or null",
  "confidence": "high | medium | low"
}
```

Process:

1. If `fund_managers.legal_name` is empty, select the largest PPM PDF.
2. Extract the first three pages.
3. Ask Claude for the JSON schema above.
4. In interactive mode, operator confirms or edits the legal name and `legal_name_confirmed_at` is stamped.
5. In `--skip-legal-name-prompt` mode, the name is written without confirmation and `legal_name_confirmed_at` remains null.

Deferred to v1: feeder entity, GP entity, administrator, jurisdiction.

## 7. Eval Harness

Eval questions live in `data/fund_eval_questions.json`.

Acceptance target:

- Default egress mode excludes side letters and sub agreements, so side-letter questions are skipped.
- At least 85% of included questions must retrieve one or more chunks whose doc_type matches the expected set.

GrandLine baseline numbers:

- Smoke fixture chunk count: pending first fixture run.
- Full corpus chunk count: pending first full run.
- Latest eval result: pending first full run.

## 8. Egress Approvals

Default policy: side letters and subscription agreements are excluded because both OpenAI and Anthropic are in the data path.

- OpenAI receives chunk text for embeddings.
- Anthropic receives PPM excerpt text for legal-name extraction and retrieved chunks for answer synthesis.

Before running with `--exclude-doc-types ""`, record approval here:

| Date | Approver | Scope | Vendors | Notes |
|---|---|---|---|---|
| Pending | Pending | Pending | OpenAI, Anthropic | Default remains `side_letter,sub_agreement` excluded. |

## 9. Failure Runbook

- Encrypted PDF: log `failed`, `encrypted`.
- Dropbox online-only file with byte size 0 in local mode: log `failed`, `smart_sync_offline`; rerun with `--source-provider dropbox`.
- Expired Dropbox credential: refresh `DROPBOX_MCP_TOKEN`, then rerun with `--resume`.
- Corrupted XLSX: log `failed`, `xlsx_parse_error:<message>`.
- DOC legacy Word: log `skipped_unsupported_extension`, `format=doc`.
- Image files: log `skipped_unsupported_extension`, `format=png/jpg/jpeg`.
- Cost above ceiling: exit 1 before writing documents/chunks.
- Concurrent run: exit 1 with lockfile path.

## 10. OIG Shared Skill Contract

Capability name: Fund Doc Search.

Code/tool slug: `fund-doc-search`.

Inputs:

- `fund_slug`
- `question`
- optional `doc_types`
- optional retrieval controls such as `top_k` and `similarity_floor`

Outputs:

- answer text
- citation list with filepath and locator
- retrieved chunk metadata
- refusal when no supporting chunks are found

Rule: OIG agents, including Chief of Staff, must not answer fund-document factual questions from memory when Fund Doc Search is available. They should search Fund Doc Search and cite returned source chunks.
