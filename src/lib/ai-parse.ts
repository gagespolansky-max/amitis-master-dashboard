import { z, ZodSchema } from 'zod'

/**
 * Strip markdown code fences from AI response text.
 * Handles ```json, ```svg, ```xml, and plain ``` fences.
 */
export function stripMarkdownFences(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json|svg|xml)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  }
  return cleaned.trim()
}

/**
 * Extract text content from a Claude API message response.
 * Handles single text blocks and multi-block responses (e.g. web_search).
 */
export function extractTextFromResponse(response: { content: { type: string; text?: string }[] }): string {
  const textBlocks = response.content.filter(b => b.type === 'text')
  return textBlocks.map(b => (b as { type: 'text'; text: string }).text).join('').trim()
}

/**
 * Parse an AI response string through fence stripping, JSON.parse, and Zod validation.
 * Throws on failure — use for routes where failure should return an error response.
 */
export function parseAIResponse<T>(text: string, schema: ZodSchema<T>): T {
  const cleaned = stripMarkdownFences(text)
  const raw = JSON.parse(cleaned)
  return schema.parse(raw)
}

/**
 * Safe version of parseAIResponse — never throws.
 * Returns { success, data, error } for logging without crashing.
 */
export function safeParseAIResponse<T>(
  text: string,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; data: undefined; error: string } {
  try {
    const cleaned = stripMarkdownFences(text)
    const raw = JSON.parse(cleaned)
    const result = schema.safeParse(raw)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, data: undefined, error: result.error.message }
  } catch (e) {
    return { success: false, data: undefined, error: e instanceof Error ? e.message : String(e) }
  }
}
