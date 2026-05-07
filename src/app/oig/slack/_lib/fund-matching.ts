export interface FundChoice {
  slug: string
  displayName: string
  aliases?: string[]
}

export interface ParsedFundDocMention {
  fund: FundChoice | null
  question: string
  cleanedText: string
  matchedAlias: string | null
  reason: "ok" | "missing_fund" | "ambiguous_fund" | "missing_question"
  candidateFunds: FundChoice[]
}

interface AliasMatch {
  fund: FundChoice
  alias: string
  normalizedAlias: string
}

export function parseFundDocSlackMention(
  text: string,
  fundChoices: FundChoice[],
): ParsedFundDocMention {
  const cleanedText = cleanSlackMentionText(text)
  const matches = findFundMatches(cleanedText, fundChoices)
  const uniqueFunds = uniqueFundMatches(matches)

  if (uniqueFunds.length === 0) {
    return {
      fund: null,
      question: cleanedText,
      cleanedText,
      matchedAlias: null,
      reason: "missing_fund",
      candidateFunds: [],
    }
  }

  if (uniqueFunds.length > 1) {
    return {
      fund: null,
      question: cleanedText,
      cleanedText,
      matchedAlias: null,
      reason: "ambiguous_fund",
      candidateFunds: uniqueFunds,
    }
  }

  const bestMatch = matches.find((match) => match.fund.slug === uniqueFunds[0].slug)
  const question = stripLeadingFundCue(cleanedText, bestMatch?.alias ?? uniqueFunds[0].displayName)

  if (!question) {
    return {
      fund: uniqueFunds[0],
      question,
      cleanedText,
      matchedAlias: bestMatch?.alias ?? null,
      reason: "missing_question",
      candidateFunds: uniqueFunds,
    }
  }

  return {
    fund: uniqueFunds[0],
    question,
    cleanedText,
    matchedAlias: bestMatch?.alias ?? null,
    reason: "ok",
    candidateFunds: uniqueFunds,
  }
}

export function cleanSlackMentionText(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, " ")
    .replace(/<([^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<([^>]+)>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeFundText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findFundMatches(text: string, fundChoices: FundChoice[]): AliasMatch[] {
  const normalizedText = ` ${normalizeFundText(text)} `
  const matches: AliasMatch[] = []

  for (const fund of fundChoices) {
    for (const alias of aliasesForFund(fund)) {
      const normalizedAlias = normalizeFundText(alias)
      if (!normalizedAlias) continue
      if (normalizedText.includes(` ${normalizedAlias} `)) {
        matches.push({ fund, alias, normalizedAlias })
      }
    }
  }

  return matches.sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length)
}

function uniqueFundMatches(matches: AliasMatch[]): FundChoice[] {
  const bySlug = new Map<string, FundChoice>()
  for (const match of matches) {
    if (!bySlug.has(match.fund.slug)) bySlug.set(match.fund.slug, match.fund)
  }
  return Array.from(bySlug.values())
}

function aliasesForFund(fund: FundChoice): string[] {
  return uniqueStrings([
    fund.slug,
    fund.slug.replace(/-/g, " "),
    fund.displayName,
    ...(fund.aliases ?? []),
  ])
}

function stripLeadingFundCue(text: string, alias: string): string {
  const aliasPattern = normalizeFundText(alias)
    .split(" ")
    .filter(Boolean)
    .map(escapeRegExp)
    .join("[\\s_-]+")
  if (!aliasPattern) return text.trim()

  const leadingCue = new RegExp(
    `^(?:please\\s+)?(?:for|re|regarding|about|in)?\\s*${aliasPattern}\\s*[:,;\\-]*\\s*`,
    "i",
  )
  const trimmed = text.trim()
  const stripped = text.replace(leadingCue, "").trim()
  return stripped === trimmed ? trimmed : stripped
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
