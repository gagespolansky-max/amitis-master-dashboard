import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { skillName, skillDescription, installedContext, messages } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are the Skill Advisor for Amitis Capital, a hedge fund. You're analyzing the skill "${skillName}" (${skillDescription}).

INSTALLED SKILLS AT AMITIS:
${installedContext}

AMITIS CONTEXT: Hedge fund with fund-of-funds structure. 13 underlying funds. Workflows include: fund return reporting (Gmail → Portfolio Model → one-pagers → Mailchimp newsletter), marketing (decks, newsletters, X posts), ACIO deal pipeline, Attio CRM for cap raising, research/diligence.

When advising on skill fit, be specific about: Amitis workflow mapping, required modifications, complementary skills, and honest assessment of whether it's worth installing.`,
      messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    })

    const content = response.content.map((b) => b.type === 'text' ? b.text : '').join('\n')
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Skills chat error:', error)
    return NextResponse.json({ content: 'Error generating response. Check API configuration.' }, { status: 500 })
  }
}
