#!/usr/bin/env python3
"""Batch wrapper for Fund Doc Search indexing.

This intentionally delegates extraction, embedding, and Supabase writes to
index_fund_docs.py. The wrapper owns queue selection, manifest roots, smoke
checks, and concise run summaries.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import shlex
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = PROJECT_ROOT / "agents" / "fund-indexer" / "fund-source-roots.json"
INDEX_SCRIPT = PROJECT_ROOT / "scripts" / "index_fund_docs.py"
QUERY_SCRIPT = PROJECT_ROOT / "scripts" / "query_funds.py"


@dataclass(frozen=True)
class CommandResult:
    returncode: int
    stdout: str | None
    stderr: str | None
    stdout_tail: str | None
    stderr_tail: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index multiple Fund Doc Search funds from a manifest.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="Path to fund source-root manifest.")
    parser.add_argument("--funds", default="all", help="Comma-separated fund slugs, or all.")
    parser.add_argument("--list-funds", action="store_true", help="List enabled funds and exit.")
    parser.add_argument("--source-provider", choices=("auto", "local", "dropbox"), help="Override manifest source provider.")
    parser.add_argument("--max-cost-usd-per-fund", type=float, help="Override manifest per-fund cost ceiling.")
    parser.add_argument("--exclude-doc-types", help="Override manifest doc-type exclusions. Use empty string to include all.")
    parser.add_argument("--resume", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--skip-legal-name-prompt", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--dry-run", action="store_true", help="Print commands without indexing.")
    parser.add_argument(
        "--terminal-handoff",
        action="store_true",
        help="Print one copy/paste terminal command for the selected batch and exit.",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON summary.")
    parser.add_argument("--no-smoke", action="store_true", help="Skip retrieval-only smoke checks after successful indexing.")
    parser.add_argument("--smoke-question", help="Override the manifest smoke question.")
    parser.add_argument("--stop-on-error", action="store_true", help="Stop after the first failed fund.")
    parser.add_argument("--concurrency", type=int, default=1, help="Number of funds to index at once. Keep small.")
    parser.add_argument("--python", default=sys.executable, help="Python executable to use for child scripts.")
    parser.add_argument("--tail-chars", type=int, default=4000, help="Captured stdout/stderr tail length.")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_manifest(path: Path) -> dict[str, Any]:
    with path.expanduser().resolve().open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest.get("funds"), list):
        raise ValueError(f"Manifest {path} must contain a funds list.")
    return manifest


def enabled_funds(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    return [fund for fund in manifest["funds"] if fund.get("enabled", True)]


def select_funds(manifest: dict[str, Any], raw: str) -> list[dict[str, Any]]:
    funds = enabled_funds(manifest)
    by_slug = {fund["slug"].casefold(): fund for fund in funds}
    if raw.strip().casefold() == "all":
        return funds

    selected: list[dict[str, Any]] = []
    missing: list[str] = []
    for part in raw.split(","):
        key = part.strip().casefold()
        if not key:
            continue
        fund = by_slug.get(key)
        if fund is None:
            missing.append(part.strip())
        else:
            selected.append(fund)

    if missing:
        known = ", ".join(fund["slug"] for fund in funds)
        raise ValueError(f"Unknown fund slug(s): {', '.join(missing)}. Known slugs: {known}")
    if not selected:
        raise ValueError("No funds selected.")
    return selected


def defaults(manifest: dict[str, Any]) -> dict[str, Any]:
    return manifest.get("defaults") or {}


def index_command(args: argparse.Namespace, manifest: dict[str, Any], fund: dict[str, Any]) -> list[str]:
    manifest_defaults = defaults(manifest)
    source_provider = args.source_provider or manifest_defaults.get("source_provider", "dropbox")
    max_cost = args.max_cost_usd_per_fund
    if max_cost is None:
        max_cost = float(manifest_defaults.get("max_cost_usd_per_fund", 5.0))
    exclude_doc_types = args.exclude_doc_types
    if exclude_doc_types is None:
        exclude_doc_types = manifest_defaults.get("exclude_doc_types", "side_letter,sub_agreement")

    command = [
        args.python,
        str(INDEX_SCRIPT),
        "--fund",
        fund["slug"],
        "--display-name",
        fund.get("display_name") or fund["slug"],
        "--source-provider",
        source_provider,
        "--max-cost-usd",
        str(max_cost),
        "--exclude-doc-types",
        exclude_doc_types,
    ]
    if args.resume:
        command.append("--resume")
    if args.skip_legal_name_prompt:
        command.append("--skip-legal-name-prompt")
    for root in fund.get("roots") or []:
        command.extend(["--source-root", root["path"]])
    return command


def smoke_command(args: argparse.Namespace, manifest: dict[str, Any], fund: dict[str, Any]) -> list[str]:
    manifest_defaults = defaults(manifest)
    exclude_doc_types = args.exclude_doc_types
    if exclude_doc_types is None:
        exclude_doc_types = manifest_defaults.get("exclude_doc_types", "side_letter,sub_agreement")
    question = args.smoke_question or manifest_defaults.get("smoke_question") or "What are the management fee terms?"

    return [
        args.python,
        str(QUERY_SCRIPT),
        "--fund",
        fund["slug"],
        "--retrieval-only",
        "--question",
        question,
        "--exclude-doc-types",
        exclude_doc_types,
        "--json",
    ]


def tail(value: str | None, max_chars: int) -> str | None:
    if not value:
        return None
    return value[-max_chars:]


def run_command(command: list[str], *, capture: bool, tail_chars: int) -> CommandResult:
    if capture:
        completed = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        return CommandResult(
            returncode=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
            stdout_tail=tail(completed.stdout, tail_chars),
            stderr_tail=tail(completed.stderr, tail_chars),
        )

    completed = subprocess.run(command, cwd=PROJECT_ROOT, check=False)
    return CommandResult(returncode=completed.returncode, stdout=None, stderr=None, stdout_tail=None, stderr_tail=None)


def parse_smoke(stdout_tail: str | None) -> dict[str, Any]:
    if not stdout_tail:
        return {"citation_count": None, "refused": None}
    try:
        payload = json.loads(stdout_tail)
    except json.JSONDecodeError:
        return {"citation_count": None, "refused": None, "parse_error": "smoke_stdout_was_not_json"}
    citations = payload.get("citations") or []
    return {
        "citation_count": len(citations),
        "refused": bool(payload.get("refused")),
    }


def render_command(command: list[str]) -> str:
    return shlex.join(command)


def terminal_handoff_command(args: argparse.Namespace, manifest: dict[str, Any]) -> str:
    manifest_defaults = defaults(manifest)
    source_provider = args.source_provider or manifest_defaults.get("source_provider", "dropbox")
    max_cost = args.max_cost_usd_per_fund
    if max_cost is None:
        max_cost = float(manifest_defaults.get("max_cost_usd_per_fund", 5.0))
    exclude_doc_types = args.exclude_doc_types
    if exclude_doc_types is None:
        exclude_doc_types = manifest_defaults.get("exclude_doc_types", "side_letter,sub_agreement")

    command = [
        ".venv/bin/python",
        "scripts/index_fund_batch.py",
        "--funds",
        args.funds,
        "--source-provider",
        source_provider,
        "--max-cost-usd-per-fund",
        f"{max_cost:.2f}",
        "--exclude-doc-types",
        exclude_doc_types,
    ]
    command.append("--resume" if args.resume else "--no-resume")
    command.append("--skip-legal-name-prompt" if args.skip_legal_name_prompt else "--no-skip-legal-name-prompt")
    if args.no_smoke:
        command.append("--no-smoke")
    if args.stop_on_error:
        command.append("--stop-on-error")
    if args.concurrency != 1:
        command.extend(["--concurrency", str(args.concurrency)])
    if Path(args.manifest).expanduser().resolve() != DEFAULT_MANIFEST:
        command.extend(["--manifest", args.manifest])

    return "cd /Users/gage/master-dashboard\n" + render_command(command)


def run_fund(args: argparse.Namespace, manifest: dict[str, Any], fund: dict[str, Any], *, capture: bool) -> dict[str, Any]:
    started = time.time()
    index_cmd = index_command(args, manifest, fund)
    smoke_cmd = smoke_command(args, manifest, fund)

    result: dict[str, Any] = {
        "fund": fund["slug"],
        "display_name": fund.get("display_name"),
        "started_at": utc_now(),
        "index_command": render_command(index_cmd),
        "smoke_command": None if args.no_smoke else render_command(smoke_cmd),
    }

    if args.dry_run:
        result.update(
            {
                "status": "dry_run",
                "index_returncode": None,
                "smoke_returncode": None,
                "duration_seconds": 0.0,
            }
        )
        return result

    if not capture:
        print(f"\n=== Indexing {fund['slug']} ===", flush=True)
    index_result = run_command(index_cmd, capture=capture, tail_chars=args.tail_chars)
    result.update(
        {
            "index_returncode": index_result.returncode,
            "index_stdout_tail": index_result.stdout_tail,
            "index_stderr_tail": index_result.stderr_tail,
        }
    )

    if index_result.returncode != 0:
        result.update(
            {
                "status": "index_failed",
                "smoke_returncode": None,
                "finished_at": utc_now(),
                "duration_seconds": round(time.time() - started, 2),
            }
        )
        return result

    if args.no_smoke:
        result.update(
            {
                "status": "indexed",
                "smoke_status": "skipped",
                "smoke_returncode": None,
                "finished_at": utc_now(),
                "duration_seconds": round(time.time() - started, 2),
            }
        )
        return result

    if not capture:
        print(f"\n=== Smoke query {fund['slug']} ===", flush=True)
    smoke_result = run_command(smoke_cmd, capture=True, tail_chars=args.tail_chars)
    smoke_summary = parse_smoke(smoke_result.stdout)
    citation_count = smoke_summary.get("citation_count")
    refused = smoke_summary.get("refused")
    smoke_status = "passed" if smoke_result.returncode == 0 and citation_count and not refused else "failed"

    result.update(
        {
            "status": "indexed" if smoke_status == "passed" else "smoke_failed",
            "smoke_status": smoke_status,
            "smoke_returncode": smoke_result.returncode,
            "smoke_stdout_tail": smoke_result.stdout_tail,
            "smoke_stderr_tail": smoke_result.stderr_tail,
            **smoke_summary,
            "finished_at": utc_now(),
            "duration_seconds": round(time.time() - started, 2),
        }
    )
    return result


def print_fund_list(manifest: dict[str, Any], *, as_json: bool) -> None:
    funds = enabled_funds(manifest)
    if as_json:
        print(json.dumps({"funds": funds}, indent=2))
        return
    for fund in funds:
        roots = fund.get("roots") or []
        print(f"{fund['slug']}: {fund.get('display_name') or fund['slug']} ({len(roots)} roots)")


def main() -> int:
    args = parse_args()
    manifest = load_manifest(Path(args.manifest))

    if args.concurrency < 1:
        raise ValueError("--concurrency must be at least 1.")

    if args.list_funds:
        print_fund_list(manifest, as_json=args.json)
        return 0

    if args.terminal_handoff:
        print(terminal_handoff_command(args, manifest))
        return 0

    funds = select_funds(manifest, args.funds)
    capture = args.json or args.concurrency > 1
    summary: dict[str, Any] = {
        "started_at": utc_now(),
        "manifest": str(Path(args.manifest).expanduser().resolve()),
        "funds_requested": [fund["slug"] for fund in funds],
        "dry_run": args.dry_run,
        "concurrency": args.concurrency,
        "results": [],
    }

    if args.dry_run and not args.json:
        for fund in funds:
            result = run_fund(args, manifest, fund, capture=True)
            print(f"\n# {fund['slug']}")
            print(result["index_command"])
            if result["smoke_command"]:
                print(result["smoke_command"])
            summary["results"].append(result)
    elif args.concurrency == 1:
        for fund in funds:
            result = run_fund(args, manifest, fund, capture=capture)
            summary["results"].append(result)
            if args.stop_on_error and result["status"] not in {"indexed", "dry_run"}:
                break
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
            future_to_fund = {
                executor.submit(run_fund, args, manifest, fund, capture=True): fund for fund in funds
            }
            for future in concurrent.futures.as_completed(future_to_fund):
                result = future.result()
                summary["results"].append(result)
                if args.stop_on_error and result["status"] not in {"indexed", "dry_run"}:
                    for pending in future_to_fund:
                        pending.cancel()
                    break

    summary["finished_at"] = utc_now()
    summary["failed_count"] = sum(1 for result in summary["results"] if result["status"] not in {"indexed", "dry_run"})

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print("\n=== Batch summary ===")
        for result in summary["results"]:
            smoke = result.get("smoke_status") or "n/a"
            citations = result.get("citation_count")
            citation_text = "" if citations is None else f", citations={citations}"
            print(f"{result['fund']}: {result['status']}, smoke={smoke}{citation_text}")

    return 1 if summary["failed_count"] else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        raise SystemExit(130)
