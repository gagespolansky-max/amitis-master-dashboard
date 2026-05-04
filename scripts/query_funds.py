#!/usr/bin/env python3
"""Query Fund Doc Search with cited retrieval and optional eval mode."""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - optional dependency fallback
    load_dotenv = None


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXCLUDED_DOC_TYPES = "side_letter,sub_agreement"
EMBEDDING_MODEL = "text-embedding-3-small"


@dataclass
class RetrievedChunk:
    marker: str
    chunk_id: str
    filepath: str
    filename: str
    doc_type: str
    locator_kind: str
    locator_value: str | None
    text: str
    similarity: float

    @property
    def citation_label(self) -> str:
        if self.locator_value:
            return f"{self.filepath} ({self.locator_kind}: {self.locator_value})"
        return f"{self.filepath} (locator: none)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ask a cited question over indexed fund documents.")
    parser.add_argument("--fund", required=True, help="Fund slug, e.g. grandline.")
    parser.add_argument("--question", help="Natural-language question to answer.")
    parser.add_argument("--doc-types", help="Comma-separated doc_type filter.")
    parser.add_argument("--exclude-doc-types", default=DEFAULT_EXCLUDED_DOC_TYPES)
    parser.add_argument("--top-k", type=int, default=8)
    parser.add_argument("--similarity-floor", type=float, default=0.5)
    parser.add_argument("--eval-file", help="JSON eval harness path.")
    parser.add_argument("--embedding-model", default=EMBEDDING_MODEL)
    parser.add_argument("--anthropic-model", default=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"))
    parser.add_argument("--retrieval-only", action="store_true", help="Return cited retrieved chunks without LLM synthesis.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if load_dotenv:
        load_dotenv(PROJECT_ROOT / ".env.local")

    supabase = make_supabase_client()
    doc_types = parse_csv_arg(args.doc_types)
    excluded_doc_types = parse_csv_arg(args.exclude_doc_types)

    if args.eval_file:
        return run_eval(args, supabase, doc_types, excluded_doc_types)

    if not args.question:
        print("ERROR: --question is required unless --eval-file is provided.", file=sys.stderr)
        return 2

    result = answer_question(
        supabase=supabase,
        fund_slug=args.fund,
        question=args.question,
        doc_types=doc_types,
        excluded_doc_types=excluded_doc_types,
        top_k=args.top_k,
        similarity_floor=args.similarity_floor,
        embedding_model=args.embedding_model,
        anthropic_model=args.anthropic_model,
        retrieval_only=args.retrieval_only,
    )
    if args.json:
        print(json.dumps(result, indent=2))
        return 0
    print_answer(result)
    return 0


def make_supabase_client():
    try:
        from supabase import create_client
    except Exception as exc:
        raise RuntimeError("Missing dependency: supabase. Install with pip install supabase.") from exc
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    return create_client(url, key)


def answer_question(
    *,
    supabase,
    fund_slug: str,
    question: str,
    doc_types: list[str],
    excluded_doc_types: list[str],
    top_k: int,
    similarity_floor: float,
    embedding_model: str,
    anthropic_model: str,
    retrieval_only: bool = False,
) -> dict[str, Any]:
    retrieved = retrieve_chunks(
        supabase=supabase,
        fund_slug=fund_slug,
        question=question,
        doc_types=doc_types,
        excluded_doc_types=excluded_doc_types,
        top_k=top_k,
        similarity_floor=similarity_floor,
        embedding_model=embedding_model,
    )
    if not retrieved:
        return {
            "fund": fund_slug,
            "question": question,
            "refused": True,
            "answer": f"No relevant chunks found for fund={fund_slug}. Try broadening doc-types or lowering similarity floor.",
            "citations": [],
            "retrieved_chunks": [],
        }

    if retrieval_only:
        return {
            "fund": fund_slug,
            "question": question,
            "refused": False,
            "answer": "Retrieval-only mode: inspect the cited chunks below.",
            "citations": chunk_citations(retrieved),
            "retrieved_chunks": chunk_previews(retrieved),
        }

    answer = synthesize_with_claude(question, retrieved, anthropic_model)
    if not re.search(r"\[\d+\]", answer):
        answer = (
            "I found potentially relevant chunks, but the synthesis did not produce a cited answer. "
            "Please inspect the retrieved chunks below."
        )
    return {
        "fund": fund_slug,
        "question": question,
        "refused": False,
        "answer": answer,
        "citations": chunk_citations(retrieved),
        "retrieved_chunks": chunk_previews(retrieved),
    }


def chunk_citations(chunks: list[RetrievedChunk]) -> list[dict[str, Any]]:
    return [
        {
            "marker": chunk.marker,
            "filepath": chunk.filepath,
            "locator_kind": chunk.locator_kind,
            "locator_value": chunk.locator_value,
            "doc_type": chunk.doc_type,
            "similarity": chunk.similarity,
        }
        for chunk in chunks
    ]


def chunk_previews(chunks: list[RetrievedChunk]) -> list[dict[str, Any]]:
    return [
        {
            "marker": chunk.marker,
            "doc_type": chunk.doc_type,
            "similarity": chunk.similarity,
            "filepath": chunk.filepath,
            "locator_kind": chunk.locator_kind,
            "locator_value": chunk.locator_value,
            "text_preview": chunk.text[:500],
        }
        for chunk in chunks
    ]


def retrieve_chunks(
    *,
    supabase,
    fund_slug: str,
    question: str,
    doc_types: list[str],
    excluded_doc_types: list[str],
    top_k: int,
    similarity_floor: float,
    embedding_model: str,
) -> list[RetrievedChunk]:
    query_embedding = embed_question(question, embedding_model)
    candidate_count = max(top_k * 4, 24)
    resp = supabase.rpc(
        "match_fund_document_chunks",
        {
            "p_fund_slug": fund_slug,
            "p_query_embedding": vector_to_text(query_embedding),
            "p_match_count": candidate_count,
            "p_doc_types": doc_types or None,
            "p_exclude_doc_types": excluded_doc_types,
        },
    ).execute()
    rows = resp.data or []
    base_keep = min(top_k, 4, len(rows))
    selected_rows = rows[:base_keep]
    seen = {row["chunk_id"] for row in selected_rows}
    for row in rows[base_keep:]:
        if len(selected_rows) >= top_k:
            break
        if float(row.get("similarity") or 0) >= similarity_floor and row["chunk_id"] not in seen:
            selected_rows.append(row)
            seen.add(row["chunk_id"])
    return [
        RetrievedChunk(
            marker=f"[{idx}]",
            chunk_id=str(row["chunk_id"]),
            filepath=str(row["filepath"]),
            filename=str(row["filename"]),
            doc_type=str(row["doc_type"]),
            locator_kind=str(row.get("locator_kind") or "none"),
            locator_value=row.get("locator_value"),
            text=str(row["text"]),
            similarity=float(row.get("similarity") or 0),
        )
        for idx, row in enumerate(selected_rows, start=1)
    ]


def embed_question(question: str, model: str) -> list[float]:
    try:
        from openai import OpenAI
    except Exception as exc:
        raise RuntimeError("Missing dependency: openai. Install with pip install openai.") from exc
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not is_plausible_openai_key(api_key) and sys.stdin.isatty():
        api_key = getpass.getpass("Paste OpenAI API key and press Enter: ").strip()
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
    if not is_plausible_openai_key(os.environ.get("OPENAI_API_KEY", "")):
        raise RuntimeError("Missing or invalid OPENAI_API_KEY")
    client = OpenAI()
    resp = retry_api_call(lambda: client.embeddings.create(model=model, input=question))
    return resp.data[0].embedding


def synthesize_with_claude(question: str, chunks: list[RetrievedChunk], model: str) -> str:
    try:
        import anthropic
    except Exception as exc:
        raise RuntimeError("Missing dependency: anthropic. Install with pip install anthropic.") from exc
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("Missing ANTHROPIC_API_KEY")
    client = anthropic.Anthropic()
    context = "\n\n".join(
        f"{chunk.marker} {chunk.citation_label}\n"
        f"doc_type={chunk.doc_type}; similarity={chunk.similarity:.4f}\n"
        f"{chunk.text[:5000]}"
        for chunk in chunks
    )
    prompt = (
        "Answer the user's fund-document question using only the numbered chunks below. "
        "Cite every factual claim with one or more markers like [1]. "
        "If the chunks do not support an answer, say so and explain what is missing.\n\n"
        f"Question: {question}\n\nChunks:\n{context}"
    )
    msg = retry_api_call(
        lambda: client.messages.create(
            model=model,
            max_tokens=1200,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
    )
    return "".join(block.text for block in msg.content if getattr(block, "type", "") == "text").strip()


def run_eval(
    args: argparse.Namespace,
    supabase,
    doc_types: list[str],
    excluded_doc_types: list[str],
) -> int:
    path = Path(args.eval_file).expanduser()
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    data = json.loads(path.read_text(encoding="utf-8"))
    questions = data.get(args.fund)
    if not isinstance(questions, list):
        print(f"ERROR: no eval questions found for fund={args.fund}", file=sys.stderr)
        return 2

    included = 0
    passed = 0
    failed: list[dict[str, Any]] = []
    skipped = 0
    for idx, item in enumerate(questions, start=1):
        question = item["question"]
        expected = item.get("expected_doc_types", [])
        if expected and all(doc_type in excluded_doc_types for doc_type in expected):
            skipped += 1
            print(f"SKIP {idx:02d}: skipped_excluded_doctype: {question}")
            continue
        included += 1
        effective_doc_types = doc_types or [dt for dt in expected if dt not in excluded_doc_types]
        chunks = retrieve_chunks(
            supabase=supabase,
            fund_slug=args.fund,
            question=question,
            doc_types=effective_doc_types,
            excluded_doc_types=excluded_doc_types,
            top_k=args.top_k,
            similarity_floor=args.similarity_floor,
            embedding_model=args.embedding_model,
        )
        matching = [chunk for chunk in chunks if chunk.doc_type in expected]
        if matching:
            passed += 1
            best = matching[0]
            print(f"PASS {idx:02d}: {question} -> {best.marker} {best.doc_type} sim={best.similarity:.4f}")
        else:
            failed.append(
                {
                    "index": idx,
                    "question": question,
                    "expected_doc_types": expected,
                    "retrieved_doc_types": [chunk.doc_type for chunk in chunks],
                }
            )
            print(f"FAIL {idx:02d}: {question}")

    required = int(included * 0.85 + 0.9999)
    print(f"\nEval summary: {passed}/{included} included passed; {skipped} skipped; required >= {required}.")
    if failed:
        print("\nFailed questions:")
        print(json.dumps(failed, indent=2))
    return 0 if passed >= required else 1


def print_answer(result: dict[str, Any]) -> None:
    print("Answer:")
    print(result["answer"])
    print("\nRetrieved chunks:")
    for chunk in result["retrieved_chunks"]:
        locator = (
            f"{chunk['locator_kind']}: {chunk['locator_value']}"
            if chunk.get("locator_value")
            else "locator: none"
        )
        print(
            f"{chunk['marker']} similarity={chunk['similarity']:.4f} "
            f"doc_type={chunk['doc_type']} {chunk['filepath']} ({locator})"
        )
    print("\nCitations:")
    for citation in result["citations"]:
        locator = (
            f"{citation['locator_kind']}: {citation['locator_value']}"
            if citation.get("locator_value")
            else "locator: none"
        )
        print(
            f"{citation['marker']} {citation['filepath']} ({locator}) "
            f"doc_type={citation['doc_type']} similarity={citation['similarity']:.4f}"
        )


def vector_to_text(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.10f}" for value in vector) + "]"


def parse_csv_arg(value: str | None) -> list[str]:
    if value is None:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def retry_api_call(func):
    delay = 1.0
    last_exc: Exception | None = None
    for _ in range(5):
        try:
            return func()
        except Exception as exc:
            last_exc = exc
            time.sleep(delay)
            delay *= 2
    assert last_exc is not None
    raise last_exc


def is_plausible_openai_key(value: str) -> bool:
    key = value.strip()
    if not key.startswith(("sk-", "sk-proj-")):
        return False
    lowered = key.casefold()
    return "your-real-openai-key" not in lowered and "placeholder" not in lowered


if __name__ == "__main__":
    raise SystemExit(main())
