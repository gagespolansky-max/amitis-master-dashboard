import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { weakTopics, profile } = await request.json()

    if (!weakTopics || weakTopics.length === 0) {
      return NextResponse.json({ readings: [] })
    }

    const topicsContext = weakTopics.slice(0, 5).join(', ')

    const profileContext = profile?.topics
      ? Object.entries(profile.topics as Record<string, { correct: number; total: number }>)
          .map(([topic, stats]) => {
            const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
            return `${topic}: ${pct}% accuracy (${stats.correct}/${stats.total})`
          })
          .join(', ')
      : 'No profile data'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `You are curating a reading list for someone learning practical AI/ML engineering — specifically an investment professional who is building AI systems at a hedge fund. Think like Dario Amodei briefing a new team member, or Alex Karp recommending readings to a Palantir engineer who needs to understand AI deeply enough to build with it.

The learner struggles with these topics: ${topicsContext}

Their current knowledge profile: ${profileContext}

Curate exactly 6 readings. These should be:
- Real, well-known articles, papers, blog posts, or documentation pages that actually exist
- Practical and applicable — not purely theoretical unless the theory directly enables building
- A mix of: foundational explainers (for gaps), hands-on tutorials (for skill-building), and thought pieces from leaders (for strategic thinking)
- Prioritized by what will close their specific knowledge gaps fastest

For each reading, explain WHY this specific person should read it given their weak areas.

Return JSON array only. No markdown fencing:
[{
  "title": "<exact title of the article/paper/post>",
  "author": "<author or organization>",
  "source": "<where it's published — e.g., Anthropic blog, arXiv, Simon Willison's blog>",
  "type": "foundational" | "hands-on" | "strategic",
  "topic": "<which weak topic this addresses>",
  "why": "<1-2 sentences on why THIS reading for THIS learner's gaps>",
  "keyTakeaway": "<the single most important thing they'll learn>",
  "estimatedMinutes": <number>
}]`,
        },
      ],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    let cleaned = text
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ readings: parsed })
  } catch (error) {
    console.error('Readings generation error:', error)
    return NextResponse.json({ readings: [] }, { status: 200 })
  }
}
