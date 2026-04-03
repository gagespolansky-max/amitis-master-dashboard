import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ARCHITECTURE_PRINCIPLES, DesignGradeSchema } from '../../_lib/lab-types'
import { parseAIResponse, extractTextFromResponse } from '@/lib/ai-parse'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { submission, challenge, size } = await request.json()

    const includeAdvanced = size === 'standard' || size === 'deep'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${ARCHITECTURE_PRINCIPLES}

You are grading an Architecture Lab submission. Be rigorous but fair — grade like a senior AI architect at Anthropic reviewing a junior engineer's design.

## The Challenge Scenario
${challenge.scenario}

## Constraints
- Token budget: ${challenge.constraints.tokenBudget}
- Latency target: ${challenge.constraints.latencyTarget}
- Compliance: ${challenge.constraints.compliance}

## Available Tools
${challenge.availableTools.join(', ')}

## Reference Solution
${JSON.stringify(challenge.referenceSolution, null, 2)}

## User's Submission
Agents: ${JSON.stringify(submission.agents, null, 2)}
Delegation Protocol: ${submission.delegationProtocol}
${includeAdvanced ? `Human Checkpoints: ${submission.humanCheckpoints}` : ''}
${includeAdvanced ? `Memory Strategy: ${submission.memoryStrategy}` : ''}

Grade each dimension 1-5:
- architecturePattern: Did they choose the right pattern? Avoid anti-patterns?
- modelTierSelection: Are expensive models used only where justified?
- toolRouting: Is each tool assigned to the right agent? Conflicts or gaps?
- delegationClarity: Could a real orchestrator follow these instructions?
${includeAdvanced ? '- humanInTheLoop: Are checkpoints at high-leverage decision points?' : ''}
${includeAdvanced ? '- memoryStrategy: Does the design account for context window limits?' : ''}

Return JSON only, no markdown fencing:
{
  "architecturePattern": <1-5>,
  "modelTierSelection": <1-5>,
  "toolRouting": <1-5>,
  "delegationClarity": <1-5>,
  ${includeAdvanced ? '"humanInTheLoop": <1-5>,' : '"humanInTheLoop": 0,'}
  ${includeAdvanced ? '"memoryStrategy": <1-5>,' : '"memoryStrategy": 0,'}
  "overall": <average of scored dimensions>,
  "feedback": "<3-4 sentences: what they got right, what they missed, specific and actionable>",
  "anthropicComparison": "<2-3 sentences comparing their design to the reference: key differences and why the reference made different choices>"
}`
      }],
    })

    const text = extractTextFromResponse(response)
    const grade = parseAIResponse(text, DesignGradeSchema)
    return NextResponse.json(grade)
  } catch (error) {
    console.error('Lab grading error:', error)
    return NextResponse.json({
      architecturePattern: 0, modelTierSelection: 0, toolRouting: 0,
      delegationClarity: 0, humanInTheLoop: 0, memoryStrategy: 0,
      overall: 0, feedback: 'Grading failed — check API credits.', anthropicComparison: ''
    })
  }
}
