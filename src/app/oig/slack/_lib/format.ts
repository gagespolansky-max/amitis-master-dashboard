import type { FundDocCitation, FundDocSearchResult } from "@/app/oig/_shared/fund-doc-search"
import type { FundChoice } from "./fund-matching"

const MAX_SLACK_TEXT_CHARS = 12_000

export function formatMissingFundReply(exampleFunds: string): string {
  return (
    "Please include one fund name or slug so I can search the right corpus.\n\n" +
    `Example: \`@FundDocs For Wincent, what are the management fee terms?\`\n` +
    `Available examples: ${exampleFunds}`
  )
}

export function formatAmbiguousFundReply(funds: FundChoice[]): string {
  const names = funds.map((fund) => `\`${fund.slug}\``).join(", ")
  return `I found more than one possible fund (${names}). Please mention exactly one fund name or slug.`
}

export function formatMissingQuestionReply(fund: FundChoice): string {
  return `I found \`${fund.slug}\`, but I still need a fund-document question to answer.`
}

export function formatNoCitationsReply(fund: FundChoice): string {
  return (
    `I could not find cited support for \`${fund.slug}\` in the indexed fund documents, ` +
    "so I should not guess from memory. Try a more specific question or ask the Fund Indexer Agent to run a smoke check."
  )
}

export function formatFundDocSlackAnswer(result: FundDocSearchResult, fund: FundChoice): string {
  if (result.refused || result.citations.length === 0) {
    return formatNoCitationsReply(fund)
  }

  const answer = slackEscape(result.answer.trim())
  const citations = result.citations.map(formatCitation).join("\n")
  const text = `*${slackEscape(fund.displayName)}*\n${answer}\n\n*Citations*\n${citations}`

  return truncateSlackText(text)
}

function formatCitation(citation: FundDocCitation): string {
  const filename = citation.filepath.split("/").filter(Boolean).at(-1) ?? citation.filepath
  const locator = formatLocator(citation)
  const similarity = Number(citation.similarity).toFixed(3)
  return (
    `${citation.marker} \`${slackEscape(filename)}\` — ` +
    `doc_type=\`${slackEscape(citation.doc_type)}\`; ${locator}; similarity=${similarity}\n` +
    `    path: \`${slackEscape(citation.filepath)}\``
  )
}

function formatLocator(citation: FundDocCitation): string {
  if (!citation.locator_value || citation.locator_kind === "none") return "locator=none"
  return `${slackEscape(citation.locator_kind)}=${slackEscape(citation.locator_value)}`
}

function truncateSlackText(text: string): string {
  if (text.length <= MAX_SLACK_TEXT_CHARS) return text
  return `${text.slice(0, MAX_SLACK_TEXT_CHARS - 80).trim()}\n\n_Response truncated for Slack._`
}

function slackEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
