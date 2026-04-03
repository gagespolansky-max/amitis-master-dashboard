import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { parseAIResponse, extractTextFromResponse } from '@/lib/ai-parse'

const client = new Anthropic()

const StudyGuideSchema = z.object({
  mastered: z.array(z.object({ topic: z.string(), note: z.string() })).default([]),
  focusAreas: z.array(z.object({
    topic: z.string(),
    gap: z.string(),
    exercise: z.string(),
    keyConcept: z.string(),
  })).default([]),
  patterns: z.array(z.string()).default([]),
  weeklyChallenge: z.object({
    title: z.string(),
    description: z.string(),
    estimatedTime: z.string().default(''),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const { profile, recentHistory } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are creating a personalized weekly study guide for someone learning AI systems and Claude Code.

## Their knowledge profile (cumulative across all quizzes):
${JSON.stringify(profile, null, 2)}

## Their last 3 quiz attempts:
${JSON.stringify(recentHistory, null, 2)}

## Create a study guide with these sections:

1. **What you've mastered** — topics where accuracy is ≥70% AND explanation scores average ≥3.5. Keep this brief, 1 sentence per topic acknowledging the strength.

2. **What to focus on this week** — topics where accuracy is <70% OR explanation scores <3. For each:
   - What the gap is (be specific: "you can pick the right answer but can't explain WHY" vs "you're getting the concept wrong entirely")
   - One concrete exercise to practice (e.g., "try building a simple RAG pipeline with 3 documents" or "open Claude Code and run /init on a project you haven't used it on")
   - One key concept to internalize (the actual knowledge, not just "study more")

3. **Pattern check** — look across all 3 quizzes for patterns:
   - Are they improving or declining in specific areas?
   - Are they getting answers right but with weak explanations (understanding is shallow)?
   - Are there topics they keep getting wrong repeatedly?

4. **This week's challenge** — one practical task they should complete this week that reinforces their weakest area. Make it specific and achievable in 30-60 minutes.

Be direct and specific. No generic advice. Reference actual topics and scores from their data.

Return JSON only, no markdown:
{
  "mastered": [{"topic": "...", "note": "..."}],
  "focusAreas": [{"topic": "...", "gap": "...", "exercise": "...", "keyConcept": "..."}],
  "patterns": ["<pattern observation 1>", "<pattern observation 2>"],
  "weeklyChallenge": {"title": "...", "description": "...", "estimatedTime": "..."}
}`,
        },
      ],
    })

    const text = extractTextFromResponse(response)
    const guide = parseAIResponse(text, StudyGuideSchema)
    return NextResponse.json(guide)
  } catch (error) {
    console.error('Study guide error:', error)
    return NextResponse.json({ error: 'Failed to generate study guide' }, { status: 500 })
  }
}
