import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ARCHITECTURE_PRINCIPLES, StressScenarioSchema, StressGradeSchema } from '../../_lib/lab-types'
import { parseAIResponse, extractTextFromResponse } from '@/lib/ai-parse'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { action, submission, challenge, weakTopics, scenarios, responses } = await request.json()

    if (action === 'generate') {
      const count = challenge.size === 'deep' ? 2 : 1
      const weakContext = weakTopics?.length > 0
        ? `Target the user's weak areas: ${weakTopics.join(', ')}`
        : ''

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `${ARCHITECTURE_PRINCIPLES}

Generate ${count} realistic failure scenario(s) for this architecture:

## Scenario
${challenge.scenario}

## User's Architecture
Agents: ${JSON.stringify(submission.agents, null, 2)}
Delegation: ${submission.delegationProtocol}
Human Checkpoints: ${submission.humanCheckpoints || 'None specified'}
Memory Strategy: ${submission.memoryStrategy || 'None specified'}

${weakContext}

Each failure scenario should expose a REAL weakness in their specific design. Be specific — reference their actual agents and tools by name.

Return JSON only, no markdown fencing:
[{
  "id": "st-<random>",
  "scenario": "<2-3 sentence failure scenario that would actually happen in production>",
  "referenceAnswer": {
    "whatBreaks": "<what specifically fails in their design>",
    "rootCause": "<the architectural weakness that allows this>",
    "fix": "<concrete change to prevent or handle this>"
  }
}]`
        }],
      })

      const text = extractTextFromResponse(response)
      const scenarios_parsed = parseAIResponse(text, StressScenarioSchema)
      return NextResponse.json({ scenarios: scenarios_parsed })
    }

    if (action === 'grade') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Grade this stress test response. Be rigorous — the user needs to demonstrate they understand WHY their architecture fails, not just that something goes wrong.

## Failure Scenario
${scenarios[0].scenario}

## Reference Answer
What breaks: ${scenarios[0].referenceAnswer.whatBreaks}
Root cause: ${scenarios[0].referenceAnswer.rootCause}
Fix: ${scenarios[0].referenceAnswer.fix}

## User's Response
What breaks: ${responses[0].whatBreaks}
Root cause: ${responses[0].rootCause}
Fix: ${responses[0].fix}

Return JSON only, no markdown fencing:
[{
  "diagnosticAccuracy": <1-5>,
  "fixQuality": <1-5>,
  "feedback": "<2-3 sentences: did they identify the real issue? Is their fix actually effective?>"
}]`
        }],
      })

      const text = extractTextFromResponse(response)
      const grades = parseAIResponse(text, StressGradeSchema)
      return NextResponse.json({ grades })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Stress test error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
