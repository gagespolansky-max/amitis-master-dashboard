import manifest from "../../../../../agents/fund-indexer/fund-source-roots.json"
import type { FundChoice } from "./fund-matching"
import { parseFundDocSlackMention } from "./fund-matching"

interface FundManifest {
  funds: Array<{
    slug: string
    display_name: string
    enabled?: boolean
    roots?: Array<{ path?: string }>
  }>
}

const fundManifest = manifest as FundManifest

export const FUND_CHOICES: FundChoice[] = fundManifest.funds
  .filter((fund) => fund.enabled !== false)
  .map((fund) => ({
    slug: fund.slug,
    displayName: fund.display_name,
    aliases: aliasesFromRoots(fund.roots ?? []),
  }))

export function parseFundDocMention(text: string) {
  return parseFundDocSlackMention(text, FUND_CHOICES)
}

export function formatFundChoicesForSlack(limit = 8): string {
  return FUND_CHOICES.slice(0, limit)
    .map((fund) => `\`${fund.slug}\``)
    .join(", ")
}

function aliasesFromRoots(roots: Array<{ path?: string }>): string[] {
  const aliases = new Set<string>()
  for (const root of roots) {
    const leaf = root.path?.split("/").filter(Boolean).at(-1)?.trim()
    if (leaf) aliases.add(leaf)
  }
  return Array.from(aliases)
}
