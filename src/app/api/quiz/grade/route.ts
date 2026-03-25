import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { question, userAnswer, correctAnswer, userExplanation, referenceExplanation, topic } =
      await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a strict grader evaluating whether someone actually understands a concept, not just whether they picked the right answer.

Question: ${question}
Correct answer: ${correctAnswer}
User's selected answer: ${userAnswer}
Reference explanation: ${referenceExplanation}
User's explanation: "${userExplanation}"

## Grading rules — follow these exactly:

**Score 1**: The explanation is empty, says "I don't know", is gibberish, restates the answer without reasoning, or shows zero understanding of WHY the answer is correct. Even if they picked the right answer, if they can't explain it, score 1.

**Score 2**: The explanation attempts reasoning but is mostly wrong, vague hand-waving, or misses the core concept entirely. Example: "because it's better" without saying why.

**Score 3**: The explanation identifies some relevant concepts but misses key parts of the reasoning. They understand something but have gaps.

**Score 4**: The explanation demonstrates solid understanding — hits the main concepts and reasoning. Minor gaps or imprecise language is okay.

**Score 5**: Expert-level. Nails the core reasoning AND shows deeper understanding (e.g., mentions tradeoffs, edge cases, or why other options fail).

## Critical: selecting the right answer is NOT enough for a passing score. The explanation must demonstrate understanding. If someone picks correctly but writes "I don't know" or "I guessed", that is a 1.

Return JSON only, no markdown fencing:
{"score": <1-5>, "feedback": "<2-3 sentences: what they demonstrated understanding of, what they missed, what to study>"}`,
        },
      ],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const cleaned = text.startsWith('```') ? text.split('\n', 1)[1]?.split('```')[0] || text : text
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ score: parsed.score, feedback: parsed.feedback, topic })
  } catch (error) {
    console.error('Grading error:', error)
    return NextResponse.json(
      { score: 0, feedback: 'Grading unavailable — check your Anthropic API credits at console.anthropic.com.', topic: '' },
      { status: 200 }
    )
  }
}
