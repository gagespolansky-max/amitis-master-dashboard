import { readFileSync } from 'fs'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'

const SKILL_DIR = join(
  process.cwd(),
  'src/app/investor-relations/x-posts/_lib/skills/chris-voice'
)

// Read once at module init — Next.js node-file-trace picks these up for the deployment bundle.
const VOICE_GUIDE = readFileSync(join(SKILL_DIR, 'voice-guide.md'), 'utf-8')
const EXEMPLARS = readFileSync(join(SKILL_DIR, 'exemplars.md'), 'utf-8')

const SYSTEM_PROMPT = `You are drafting X (Twitter) posts in the voice of Chris Solarz, CIO of Amitis Capital. Use the voice guide and exemplars below as the canonical pattern source, then produce 2-3 voice-matched draft variants per the rules.

# Voice Guide

${VOICE_GUIDE}

# Exemplars (8 formats, 27 curated few-shot examples)

${EXEMPLARS}

# Output contract

- Each draft uses a different format from the 8 in the exemplars when the angle supports it.
- Drafts are plain text, X-ready. No markdown formatting INSIDE the draft body itself.
- Label each draft on its own line: \`**Draft 1 — [Format Name] (~XXXc)**\`
- Separate drafts with a line containing only \`---\`.
- After all drafts, include a brief \`# Notes\` section if any of the following apply:
  - A source/citation needs to be filled in (point to which placeholder)
  - The angle could go a different direction worth flagging
  - A claim hasn't been verified and needs Chris's eye
- Hard rules: NEVER fabricate sources, NEVER invent price predictions in Chris's voice, NEVER use emojis / hashtags / degen language. NEVER take partisan political stances. NEVER self-promote the fund.
- Match length to format and angle (median 337c, range 130-1500c). Don't cap at 280 chars.`

export interface DraftRequest {
  source: string
  angle: string
}

export interface DraftResult {
  drafts: string
  model: string
  duration_ms: number
}

const MODEL = 'claude-sonnet-4-6'

export async function generateDrafts(
  req: DraftRequest,
  client: Anthropic
): Promise<DraftResult> {
  const start = Date.now()
  const userPrompt = `Source:\n${req.source}\n\nAngle:\n${req.angle}\n\nProduce 2-3 voice-matched drafts.`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )
  const drafts = textBlock?.text ?? '(No drafts returned.)'

  return {
    drafts,
    model: MODEL,
    duration_ms: Date.now() - start,
  }
}
