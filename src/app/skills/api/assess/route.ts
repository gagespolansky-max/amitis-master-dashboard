import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { skillName, skillDescription, workflow } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are the Amitis Capital Skill Advisor. Assess how the skill "${skillName}" would perform in the user's described workflow. Be specific about: 1) How the skill fits, 2) What modifications are needed, 3) What other skills might complement it. Keep it concise and actionable.`,
      messages: [{
        role: 'user',
        content: `Skill: ${skillName}\nDescription: ${skillDescription}\n\nWorkflow I want to use it in:\n${workflow}`,
      }],
    })

    const assessment = response.content.map((b) => b.type === 'text' ? b.text : '').join('\n')
    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Skills assess error:', error)
    return NextResponse.json({ assessment: 'Error generating assessment. Check API configuration.' }, { status: 500 })
  }
}
