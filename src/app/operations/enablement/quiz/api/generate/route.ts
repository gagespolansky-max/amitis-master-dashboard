import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { quizType, weakTopics, count } = await request.json()

    const numQuestions = count || 8

    const topicContext =
      quizType === 'ai-systems'
        ? `practical AI engineering — the kind of knowledge that separates someone who can TALK about AI from someone who can BUILD with it. The learner is an investment professional at a hedge fund building real AI systems. Questions should test whether they can make correct engineering decisions, not recite definitions.

Topic areas (focus on practical application and decision-making):
- LLM Fundamentals: when to use high vs low temperature for real tasks, how token limits affect system design, cost-per-token tradeoffs when building production systems, understanding model capabilities and limitations for real use cases
- Prompt Engineering: designing system prompts that actually work in production, structured output extraction from messy real-world data, chain-of-thought for complex reasoning tasks, handling edge cases and prompt injection
- Agentic Patterns: designing multi-step AI workflows (when to use ReAct vs plan-and-execute, tool use design, human-in-the-loop checkpoints, error recovery), understanding when agentic patterns add value vs when simple prompting suffices
- RAG & Knowledge Systems: chunking strategies for different document types (financial reports, legal docs, emails), embedding model selection, hybrid search, reranking, handling stale/conflicting data, evaluating retrieval quality
- Orchestration & Production: model routing (when to use cheap vs expensive models), fallback chains, eval pipelines, observability, latency vs quality tradeoffs, cost optimization at scale
- AI Strategy & Architecture: build vs buy decisions, when AI is the wrong tool, data flywheel design, AI safety and alignment considerations in production, understanding what frontier models can and can't do`
        : `practical Claude Code competency — the kind of mastery that lets you 10x your development speed. The learner is building real systems and needs to know how to use Claude Code as a power tool, not just a chatbot.

Topic areas (focus on real workflow mastery):
- Core Usage: efficient prompting patterns, when to provide context vs let Claude explore, multi-file operations, understanding how Claude reads and edits code
- Workflow Patterns: TDD with Claude, debugging complex issues, large refactors, maintaining context across long sessions, working with existing codebases
- Configuration & CLAUDE.md: project vs user level config, what to include and what NOT to include, scoping context effectively, making Claude Code project-aware
- MCP (Model Context Protocol): understanding what MCP servers enable, configuring external tool access, practical use cases (databases, APIs, file systems)
- Permission Model & CI/CD: headless mode, allowlists, running Claude Code in automation, security considerations
- Advanced Techniques: /init for new projects, multi-agent orchestration, custom skills, git hooks, PR review automation, piping I/O
- Troubleshooting & Best Practices: context window management, recovering from mistakes, keeping Claude on track, knowing when to start a new session`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: `Generate exactly ${numQuestions} UNIQUE multiple-choice quiz questions about ${topicContext}.

${weakTopics.length > 0 ? `Prioritize these topic areas (the user is weak here): ${weakTopics.join(', ')}` : ''}

## Critical requirements:
- Every question MUST be unique — different scenario, different concept, different angle
- Do NOT reuse similar setups (e.g., don't have two questions about "building a chatbot" or "fixing a bug")
- Each question must present a realistic workplace scenario that tests PRACTICAL DECISION-MAKING, not textbook recall
- Frame questions as "You're building X and encounter Y — what do you do?" or "Your system does X but you need Y — what's the right approach?"
- Wrong answers should be plausible things a junior person might try — not obviously absurd
- The correct answer should teach something the learner can immediately apply
- 4 options each, exactly one correct
- Mix: 3 easy, 3 medium, 2 hard
- Each question must cover a DIFFERENT sub-topic within the broader area
- Include a detailed 2-3 sentence explanation: why the correct answer works in practice, why the top wrong answer fails in practice, and what principle this teaches
- Generate unique IDs using the format "gen-XXXX" with random alphanumeric characters

Return JSON array only. No markdown fencing, no commentary:
[{
  "id": "gen-a7x2",
  "topic": "<specific topic area>",
  "difficulty": "easy" | "medium" | "hard",
  "question": "<realistic scenario-based question>",
  "options": ["<option1>", "<option2>", "<option3>", "<option4>"],
  "correctIndex": <0-3>,
  "explanation": "<why correct answer is right, why top distractor is wrong>"
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

    return NextResponse.json({ questions: parsed })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ questions: [] }, { status: 200 })
  }
}
