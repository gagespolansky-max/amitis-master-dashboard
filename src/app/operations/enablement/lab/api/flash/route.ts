import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ARCHITECTURE_PRINCIPLES, DIAGRAM_STANDARDS } from '../../_lib/lab-types'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { scenarioHistory } = await request.json()

    const previousIndustries = (scenarioHistory || []).slice(0, 5).map((s: { industry: string }) => s.industry).join(', ')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 2 }],
      messages: [{
        role: 'user',
        content: `${ARCHITECTURE_PRINCIPLES}

${DIAGRAM_STANDARDS}

Generate a Flash Review challenge: a completed architecture diagram for a random business scenario, plus 3 rapid-fire multiple-choice questions about it.

${previousIndustries ? `Avoid these industries: ${previousIndustries}` : ''}

Search the web for a recent real-world example of an agentic system to base this on.

Return JSON only, no markdown fencing:
{
  "scenario": "<1-2 sentence description of what this system does>",
  "diagramSvg": "<complete SVG code for the architecture diagram>",
  "questions": [
    {
      "question": "<question about the diagram — e.g., 'What's the biggest weakness?', 'Which agent should be downgraded to Haiku?', 'Where would you add a human checkpoint?'>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correctIndex": <0-3>,
      "explanation": "<why the correct answer is right>"
    }
  ]
}

The diagram must be complete SVG following the visual standards. Questions should test architectural judgment, not recall.`
      }],
    })

    const textBlocks = response.content.filter(b => b.type === 'text')
    const text = textBlocks.map(b => (b as { type: 'text'; text: string }).text).join('').trim()

    let cleaned = text
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)
    parsed.id = `flash-${Date.now()}`
    parsed.generatedAt = new Date().toISOString()

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Flash review error:', error)
    return NextResponse.json({ error: 'Failed to generate flash review' }, { status: 500 })
  }
}
