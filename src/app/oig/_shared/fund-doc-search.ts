import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"

export const FUND_DOC_SEARCH_SKILL_NAME = "fund-doc-search" as const

const execFileAsync = promisify(execFile)

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
  pageStart?: number | null
  pageEnd?: number | null
  locator?: string | null
  docType?: string
  similarity?: number
}

export interface FundDocSearchResult {
  answer: string
  citations: FundDocCitation[]
  refused?: boolean
  refusalReason?: string
  retrieved_chunks?: Array<Record<string, unknown>>
}

export async function searchFundDocs(args: FundDocSearchArgs): Promise<FundDocSearchResult> {
  const python = process.env.FUND_DOC_SEARCH_PYTHON || path.join(process.cwd(), ".venv/bin/python")
  const script = path.join(process.cwd(), "scripts/query_funds.py")
  const cliArgs = [
    script,
    "--fund",
    args.fundSlug,
    "--question",
    args.question,
    "--top-k",
    String(args.topK ?? 8),
    "--similarity-floor",
    String(args.similarityFloor ?? 0.5),
    "--json",
  ]

  if (args.docTypes?.length) {
    cliArgs.push("--doc-types", args.docTypes.join(","))
  }
  if (args.excludeDocTypes) {
    cliArgs.push("--exclude-doc-types", args.excludeDocTypes.join(","))
  }
  if (args.retrievalOnly) {
    cliArgs.push("--retrieval-only")
  }

  const { stdout } = await execFileAsync(python, cliArgs, {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  })
  return JSON.parse(stdout) as FundDocSearchResult
}
