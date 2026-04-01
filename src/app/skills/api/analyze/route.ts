import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { skill_md_content, skill_name } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are analyzing a Claude skill for Amitis Capital, a hedge fund that runs a fund-of-funds with 13 underlying funds. Their workflows include: fund return reporting (Gmail → Portfolio Model → one-pagers → Mailchimp newsletter), marketing (decks, newsletters, X posts from CIO Slack), ACIO deal pipeline (email monitoring → deal tracking → investment memos), Attio CRM for cap raising, and research/diligence. Tech stack: Next.js dashboard, Supabase, Claude API, Gmail API, Slack MCP.

Return ONLY valid JSON with no markdown fences.`,
      messages: [{
        role: 'user',
        content: `Analyze this skill and return a JSON object with three fields: strengths (array of strings, 3-5 items), weaknesses (array of strings, 2-4 items), and amitis_fit (object with readiness: "ready" | "needs_customization" | "not_applicable", and assessment: string — 2-3 sentences). Be specific to the actual SKILL.md content and Amitis workflows. If the skill is generic, say what customizations Amitis would need.

Skill name: ${skill_name}

Here is the full SKILL.md:

${skill_md_content || `No SKILL.md content available. Analyze based on the skill name "${skill_name}" only.`}`,
      }],
    })

    const text = response.content.map((b) => b.type === 'text' ? b.text : '').join('')
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    try {
      const analysis = JSON.parse(cleaned)
      return NextResponse.json(analysis)
    } catch {
      return NextResponse.json({
        strengths: ['Analysis generated but could not be parsed'],
        weaknesses: ['Try again or check the SKILL.md content'],
        amitis_fit: { readiness: 'needs_customization', assessment: text.slice(0, 300) },
      })
    }
  } catch (error) {
    console.error('Skills analyze error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze skill' },
      { status: 500 }
    )
  }
}
