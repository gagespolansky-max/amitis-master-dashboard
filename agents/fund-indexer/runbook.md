# Fund Indexer Runbook

Run from the project root:

```bash
cd /Users/gage/master-dashboard
```

## See The Queue

```bash
.venv/bin/python scripts/index_fund_batch.py --list-funds
```

## Dry Run All 16 Funds

```bash
.venv/bin/python scripts/index_fund_batch.py --dry-run --funds all
```

## Index All 16 Funds

```bash
.venv/bin/python scripts/index_fund_batch.py \
  --funds all \
  --source-provider dropbox \
  --resume \
  --skip-legal-name-prompt \
  --max-cost-usd-per-fund 5.00
```

## Index A Subset

```bash
.venv/bin/python scripts/index_fund_batch.py \
  --funds grandline,black-lotus,vaneck \
  --source-provider dropbox \
  --resume \
  --skip-legal-name-prompt
```

## Generate A Terminal Handoff Command

Use this when the agent surface cannot reach Dropbox but the normal terminal can:

```bash
.venv/bin/python scripts/index_fund_batch.py --terminal-handoff --funds wincent
```

It prints a complete paste-ready command with the safe defaults.

## Repair One Fund

```bash
.venv/bin/python scripts/index_fund_docs.py \
  --fund grandline \
  --source-provider dropbox \
  --resume \
  --skip-legal-name-prompt \
  --max-cost-usd 5.00
```

## Smoke Query One Fund

```bash
.venv/bin/python scripts/query_funds.py \
  --fund grandline \
  --retrieval-only \
  --question "What are the management fee terms?"
```

## Defaults

- Source provider: Dropbox.
- Resume: on for batch runs.
- Legal-name prompt: skipped for unattended runs.
- Excluded doc types: `side_letter,sub_agreement`.
- Per-fund cost ceiling: 5 USD.

## When It Fails

- `Lock held`: another run is active for that fund, or a stale lock exists. Confirm no indexer is running before removing `data/locks/fund_<slug>.lock`.
- `Missing OPENAI_API_KEY`: set it in `.env.local` or the shell environment.
- `Missing ANTHROPIC_API_KEY`: legal-name extraction will warn; retrieval-only smoke does not require answer synthesis.
- Dropbox path not found: update `agents/fund-indexer/fund-source-roots.json`.
- Zero citations in smoke: query with a broader question, inspect chunks in Supabase, and check local SQLite file events.
