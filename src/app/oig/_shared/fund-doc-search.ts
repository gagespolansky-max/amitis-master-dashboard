import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { createServerClient } from "@/lib/supabase-server"

export const FUND_DOC_SEARCH_SKILL_NAME = "fund-doc-search" as const

const EMBEDDING_MODEL = "text-embedding-3-small"
const SYNTH_MODEL = "claude-sonnet-4-5-20250929"
const DEFAULT_EXCLUDED_DOC_TYPES = ["side_letter", "sub_agreement"]
const SYNTH_MAX_TOKENS = 1200
const PER_CHUNK_TEXT_CAP = 5000
const PREVIEW_CHARS = 500

export interface FundDocSearchArgs {
  fundSlug: string
  question: string
  docTypes?: string[]
  excludeDocTypes?: string[]
  topK?: number
  similarityFloor?: number
  retrievalOnly?: boolean
}

export interface FundDocCitation {
  marker: string
  filepath: string
  locator_kind: string
  locator_value: string | null
  doc_type: string
  similarity: number
}

export interface FundDocChunkPreview {
  marker: string
  doc_type: string
  similarity: number
  filepath: string
  locator_kind: string
  locator_value: string | null
  text_preview: string
}

export interface FundDocSearchResult {
  fund: string
  question: string
  refused: boolean
  answer: string
  citations: FundDocCitation[]
  retrieved_chunks: FundDocChunkPreview[]
}

interface RpcRow {
  chunk_id: string
  document_id: string
  fund_id: string
  filepath: string
  filename: string
  source_root: string
  doc_type: string
  chunk_index: number
  locator_kind: string
  locator_value: string | null
  is_table_chunk: boolean
  token_count: number | null
  text: string
  similarity: number
}

export async function searchFundDocs(args: FundDocSearchArgs): Promise<FundDocSearchResult> {
  const topK = clamp(args.topK ?? 8, 1, 20)
  const similarityFloor = args.similarityFloor ?? 0.5
  const docTypes = args.docTypes?.length ? args.docTypes : null
  const excludeDocTypes = args.excludeDocTypes ?? DEFAULT_EXCLUDED_DOC_TYPES

  const embedding = await embedQuestion(args.question)
  const candidateCount = Math.max(topK * 4, 24)

  const supabase = createServerClient()
  const { data, error } = await supabase.rpc("match_fund_document_chunks", {
    p_fund_slug: args.fundSlug,
    p_query_embedding: vectorToText(embedding),
    p_match_count: candidateCount,
    p_doc_types: docTypes,
    p_exclude_doc_types: excludeDocTypes,
  })
  if (error) {
    throw new Error(`fund_doc_search RPC failed: ${error.message}`)
  }

  const rows = (data ?? []) as RpcRow[]
  if (rows.length === 0) {
    return {
      fund: args.fundSlug,
      question: args.question,
      refused: true,
      answer: `No relevant chunks found for fund=${args.fundSlug}. Try broadening doc-types or lowering similarity floor.`,
      citations: [],
      retrieved_chunks: [],
    }
  }

  const selected = reconcileChunks(rows, topK, similarityFloor)

  const citations: FundDocCitation[] = selected.map((row, idx) => ({
    marker: `[${idx + 1}]`,
    filepath: row.filepath,
    locator_kind: row.locator_kind || "none",
    locator_value: row.locator_value ?? null,
    doc_type: row.doc_type,
    similarity: Number(row.similarity ?? 0),
  }))

  const retrieved_chunks: FundDocChunkPreview[] = selected.map((row, idx) => ({
    marker: `[${idx + 1}]`,
    doc_type: row.doc_type,
    similarity: Number(row.similarity ?? 0),
    filepath: row.filepath,
    locator_kind: row.locator_kind || "none",
    locator_value: row.locator_value ?? null,
    text_preview: String(row.text).slice(0, PREVIEW_CHARS),
  }))

  if (args.retrievalOnly) {
    return {
      fund: args.fundSlug,
      question: args.question,
      refused: false,
      answer: "Retrieval-only mode: inspect the cited chunks below.",
      citations,
      retrieved_chunks,
    }
  }

  const answer = await synthesizeWithClaude(args.question, selected)
  const citedAnswer = /\[\d+\]/.test(answer)
    ? answer
    : "I found potentially relevant chunks, but the synthesis did not produce a cited answer. Please inspect the retrieved chunks below."

  return {
    fund: args.fundSlug,
    question: args.question,
    refused: false,
    answer: citedAnswer,
    citations,
    retrieved_chunks,
  }
}

function reconcileChunks(rows: RpcRow[], topK: number, similarityFloor: number): RpcRow[] {
  const baseKeep = Math.min(topK, 4, rows.length)
  const selected = rows.slice(0, baseKeep)
  const seen = new Set(selected.map((row) => row.chunk_id))
  for (const row of rows.slice(baseKeep)) {
    if (selected.length >= topK) break
    const sim = Number(row.similarity ?? 0)
    if (sim >= similarityFloor && !seen.has(row.chunk_id)) {
      selected.push(row)
      seen.add(row.chunk_id)
    }
  }
  return selected
}

async function embedQuestion(question: string): Promise<number[]> {
  const openai = new OpenAI()
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
  })
  return resp.data[0].embedding
}

async function synthesizeWithClaude(question: string, chunks: RpcRow[]): Promise<string> {
  const anthropic = new Anthropic()
  const context = chunks
    .map((row, idx) => {
      const marker = `[${idx + 1}]`
      const locator = row.locator_value ? `${row.locator_kind}: ${row.locator_value}` : "locator: none"
      const sim = Number(row.similarity ?? 0).toFixed(4)
      return (
        `${marker} ${row.filepath} (${locator})\n` +
        `doc_type=${row.doc_type}; similarity=${sim}\n` +
        String(row.text).slice(0, PER_CHUNK_TEXT_CAP)
      )
    })
    .join("\n\n")

  const prompt =
    "Answer the user's fund-document question using only the numbered chunks below. " +
    "Cite every factual claim with one or more markers like [1]. " +
    "If the chunks do not support an answer, say so and explain what is missing.\n\n" +
    `Question: ${question}\n\nChunks:\n${context}`

  const msg = await anthropic.messages.create({
    model: SYNTH_MODEL,
    max_tokens: SYNTH_MAX_TOKENS,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  })

  return msg.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
}

function vectorToText(vec: number[]): string {
  return "[" + vec.map((v) => v.toFixed(10)).join(",") + "]"
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
