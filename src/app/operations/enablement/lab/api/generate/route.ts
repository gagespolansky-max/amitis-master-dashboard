import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ARCHITECTURE_PRINCIPLES, INDUSTRIES } from '../../_lib/lab-types'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { size, weakTopics, scenarioHistory, learnerProfile } = await request.json()

    const agentCount = { flash: '2-3', quick: '2-3', standard: '3-5', deep: '5-7' }[size as string] || '3-5'
    const toolCount = { flash: '3-4', quick: '3-4', standard: '5-7', deep: '7-10' }[size as string] || '5-7'

    const previousScenarios = (scenarioHistory || [])
      .slice(0, 10)
      .map((s: { industry: string; businessFunction: string }) => `- ${s.industry}: ${s.businessFunction}`)
      .join('\n')

    const avoidIndustries = (scenarioHistory || [])
      .slice(0, 3)
      .map((s: { industry: string }) => s.industry)

    const suggestedIndustries = INDUSTRIES.filter(i => !avoidIndustries.includes(i))
    const randomIndustry = suggestedIndustries[Math.floor(Math.random() * suggestedIndustries.length)] || 'Financial services'

    const weakContext = weakTopics?.length > 0
      ? `The learner is weak in: ${weakTopics.join(', ')}. Design the scenario so that solving it well REQUIRES strength in these areas.`
      : ''

    const profileContext = learnerProfile
      ? `Learner profile: ${JSON.stringify(learnerProfile)}`
      : ''

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 3 }],
      messages: [{
        role: 'user',
        content: `${ARCHITECTURE_PRINCIPLES}

Generate a realistic business scenario for an Architecture Lab challenge (size: ${size}, requiring ${agentCount} agents and ${toolCount} tools).

First, search the web for:
1. Anthropic's latest published guidance on building effective agents
2. Current real-world examples of agentic systems in production
3. Current model pricing for Claude Opus, Sonnet, and Haiku

Then create a challenge. The scenario should be from the "${randomIndustry}" industry or a closely related field.

${weakContext}
${profileContext}

${previousScenarios ? `PREVIOUS SCENARIOS (do NOT repeat these industries or business functions):\n${previousScenarios}\n\nThe new scenario must be in a DIFFERENT industry with a DIFFERENT core business function.` : ''}

IMPORTANT: At least 20% of scenarios should have a reference solution where a single agent or simple prompt chain is better than multi-agent. If this scenario is one of those, say so in the reference solution.

Return JSON only, no markdown fencing:
{
  "scenario": "<2-3 paragraph realistic business scenario with specific numbers and constraints>",
  "constraints": {
    "tokenBudget": "<e.g., '$0.50-1.00 per query'>",
    "latencyTarget": "<e.g., 'under 30 seconds'>",
    "compliance": "<any safety, privacy, or regulatory requirements>"
  },
  "availableTools": ["<tool1>", "<tool2>", ...],
  "evaluationCriteria": ["<criterion1>", "<criterion2>", ...],
  "referenceSolution": {
    "architecture": "<detailed description of the ideal architecture>",
    "reasoning": "<why each decision was made, referencing Anthropic's principles>",
    "antiPatterns": "<1-2 anti-patterns a learner might be tempted to use and why they'd fail>",
    "agents": [
      {"name": "<agent name>", "modelTier": "<opus|sonnet|haiku>", "tools": ["<tool>"], "role": "<what this agent does>"}
    ],
    "delegationProtocol": "<how the orchestrator delegates work>",
    "humanCheckpoints": "<where human review is needed and why>",
    "memoryStrategy": "<how the system handles context limits>"
  }
}`
      }],
    })

    // Extract text from response (may contain multiple content blocks with web search)
    const textBlocks = response.content.filter(b => b.type === 'text')
    const text = textBlocks.map(b => (b as { type: 'text'; text: string }).text).join('').trim()

    let cleaned = text
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)
    parsed.id = `lab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    parsed.size = size
    parsed.generatedAt = new Date().toISOString()

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Lab generation error:', error)
    return NextResponse.json({ error: 'Failed to generate challenge' }, { status: 500 })
  }
}
