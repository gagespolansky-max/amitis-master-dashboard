import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { weakTopics } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `The user just completed an AI/Claude Code quiz and struggled most with these topics: ${weakTopics.join(', ')}

Generate a brief, actionable study tip for each topic (2-3 sentences max per topic). Be specific and practical — not generic "study more" advice. Reference real tools, docs, or techniques they should try.

Return JSON only:
[{"topic": "<topic>", "tip": "<actionable study tip>"}]`,
        },
      ],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const parsed = JSON.parse(text.startsWith('```') ? text.split('\n', 1)[1]?.split('```')[0] || text : text)

    return NextResponse.json({ tips: parsed })
  } catch (error) {
    console.error('Tips error:', error)
    return NextResponse.json({ tips: [] }, { status: 200 })
  }
}
