import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ARCHITECTURE_PRINCIPLES, DIAGRAM_STANDARDS } from '../../_lib/lab-types'

const client = new Anthropic()

function comfortLabel(level: string) {
  return {
    'follow-instructions': 'Can follow terminal instructions but doesn\'t write code from scratch',
    'write-scripts': 'Writes scripts and uses APIs',
    'build-apps': 'Builds and deploys full applications',
  }[level] || level
}

export async function POST(request: NextRequest) {
  try {
    const { step, context, express } = await request.json()

    // ── Step 1: Clarify ─────────────────────────────────────
    if (step === 'clarify') {
      const systemsContext = [
        context.currentSystems,
        ...(context.commonSystems || []),
      ].filter(Boolean).join(', ')

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are a senior AI architect consulting with someone who wants to automate a manual process. Your job is to deeply understand what they do before recommending anything. The user is NOT technical — they described their world in their own words. Do NOT use jargon they wouldn't know.

The user described this manual process:
"${context.processDescription}"

Systems/tools they currently use: ${systemsContext || 'Not specified'}
Data arrives in these formats: ${(context.dataFormats || []).join(', ') || 'Not specified'}
Frequency: ${context.frequency}
Manual time: ${context.manualTime}
Hardest part: ${context.hardestPart || 'Not specified'}
Success criteria: ${context.successCriteria || 'Not specified'}
Deterministic accuracy required: ${context.deterministicAccuracy}
Technical comfort level: ${comfortLabel(context.technicalComfort)}

${express ? 'Express mode — be concise. Skip the paraphrase. Ask 2 focused clarifying questions.' : ''}

Respond conversationally:
1. ${express ? 'Skip.' : 'Paraphrase the process back to confirm understanding ("So if I\'m hearing you right...")'}
2. Ask 2-3 clarifying questions the user probably didn't think to address:
   - Ambiguity in judgment steps (how much is templated vs creative?)
   - Data matching logic (exact field match vs fuzzy/contextual?)
   - Human review/approval gates
   - If they mentioned spreadsheets/Excel: ask about template structure, formulas, formatting they need preserved
   - If deterministic accuracy = yes: "Walk me through the math at a high level. Are there weightings, timing adjustments, fee structures, or other non-obvious complexity?"
3. ${express ? 'Skip.' : 'Surface any implicit complexity you notice.'}

Format with clear numbering so the user can answer each question.`
        }],
      })
      return NextResponse.json({ response: (response.content[0] as { type: string; text: string }).text })
    }

    // ── Step 2: Decompose ───────────────────────────────────
    if (step === 'decompose') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a senior AI architect. Decompose this manual process into numbered steps.

Process: "${context.processDescription}"
Systems used: ${context.currentSystems || ''} ${(context.commonSystems || []).join(', ')}
Data formats: ${(context.dataFormats || []).join(', ')}
Frequency: ${context.frequency}
Manual time: ${context.manualTime}
Deterministic accuracy needed: ${context.deterministicAccuracy}
Clarifying Q&A: ${context.clarifyingAnswers || 'None'}

For each step, classify:
- Type: Data retrieval, Transformation, Judgment/reasoning, Action, Human review, Deterministic computation, or File/spreadsheet manipulation
- Difficulty: Easy / Medium / Hard / Keep manual
- LLM appropriate: Yes / No / Risky
- One sentence explaining WHY this classification

CRITICAL: Financial calculations, statistical analysis, compliance checks, or any math that must be exact → "Deterministic computation" with LLM appropriate = "No". LLMs must NEVER do math at runtime for high-stakes operations.

${express ? 'Be concise. Brief narrative only.' : 'After the steps, explain the key insight: different step types need different solutions. Explain the difference between using AI to BUILD automation vs using AI to RUN automation. This is a critical teaching moment.'}

Return JSON only, no markdown fencing:
{
  "steps": [{"number": 1, "description": "...", "type": "...", "typeEmoji": "...", "difficulty": "...", "llmAppropriate": "...", "reasoning": "..."}],
  "narrative": "..."
}`
        }],
      })
      const text = (response.content[0] as { type: string; text: string }).text.trim()
      let cleaned = text
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      return NextResponse.json(JSON.parse(cleaned))
    }

    // ── Step 3: Recommend Tooling ────────────────────────────
    if (step === 'tooling') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 }],
        messages: [{
          role: 'user',
          content: `You are a senior AI architect recommending specific tools and technologies for a workflow automation. The user is at the "${comfortLabel(context.technicalComfort)}" level — calibrate your explanations accordingly.

Search the web for the current best tools for each need, including newer tools, domain-specific tools the user would never find on their own, current pricing, and MCP servers that connect Claude to existing systems.

## The Workflow
Process: "${context.processDescription}"
Systems they currently use: ${context.currentSystems || ''} ${(context.commonSystems || []).join(', ')}
Data formats: ${(context.dataFormats || []).join(', ')}
Deterministic accuracy needed: ${context.deterministicAccuracy}

## Decomposed Steps
${JSON.stringify(context.decomposition, null, 2)}

## Requirements for EVERY tool recommendation:
1. **What it is** — plain-English explanation assuming they've never heard of it. Not a tagline — an actual explanation of what the tool does and how.
2. **Why this tool specifically** — what makes it right for THIS step in THIS workflow. Tied to their situation.
3. **What alternatives exist and why they weren't chosen** — at least one alternative per recommendation with clear rejection reason.
4. **Build-time vs runtime role** — does Claude Code use this to build the solution, or does it run as part of the solution?
5. **How it connects** — where does this tool's output go, where does its input come from?
6. **Learning resource** — one link or reference to go deeper.

Organize recommendations BY PIPELINE STAGE (Step 1 needs..., Steps 2-3 need...) NOT by technology category.

Also recommend:
- Observability/tracing if there are LLM calls (explain what it does like "security camera footage for your AI pipeline")
- Intermediate storage if the pipeline has multiple computation steps
- Scheduling/hosting if the pipeline runs on a schedule

${express ? 'Express mode — give tool name, one-line explanation, and why for each. Skip alternatives and learning resources.' : ''}

Return JSON only, no markdown fencing:
{
  "narrative": "<conversational explanation organized by pipeline stage>",
  "tools": [
    {
      "step": "<which step(s) this serves>",
      "tool": "<tool name>",
      "whatItIs": "<plain-English explanation>",
      "whyThisTool": "<why for THIS workflow>",
      "alternatives": "<what else was considered and why rejected>",
      "buildVsRuntime": "<build-time or runtime or both>",
      "connections": "<input from X, output to Y>",
      "learnMore": "<one resource link or reference>"
    }
  ]
}`
        }],
      })
      const textBlocks = response.content.filter(b => b.type === 'text')
      const text = textBlocks.map(b => (b as { type: 'text'; text: string }).text).join('').trim()
      let cleaned = text
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      return NextResponse.json(JSON.parse(cleaned))
    }

    // ── Step 4: Recommend Architecture ──────────────────────
    if (step === 'recommend') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 3 }],
        messages: [{
          role: 'user',
          content: `${ARCHITECTURE_PRINCIPLES}

You are a senior AI architect recommending a solution architecture pattern.

Process: "${context.processDescription}"
Frequency: ${context.frequency}
Manual time: ${context.manualTime}
Deterministic accuracy needed: ${context.deterministicAccuracy}

Decomposed steps:
${JSON.stringify(context.decomposition, null, 2)}

Recommended tools from previous step:
${JSON.stringify(context.tooling, null, 2)}

Evaluate ALL 14 solution patterns:
1. Don't automate  2. Script on schedule (no AI)  3. Integration script via Claude Code (no AI at runtime)  4. RAG  5. Skill (prompt template)  6. Copilot pattern  7. Single agent with tools  8. Workflow (prompt chaining)  9. Event-driven agent  10. Pipeline with human gates  11. Multi-modal pipeline  12. Agent team  13. Deterministic computation + AI ingestion  14. Compound solution

${express ? 'Express mode — recommendation + brief rationale. Skip alternative rejections.' : `Your response MUST:
1. State the recommendation and primary reason
2. Explain why 2-3 plausible alternatives were rejected
3. Map each decomposed step to a component using the SPECIFIC TOOLS from Step 3
4. Call out risks and tradeoffs
5. For compound solutions, explain which steps use which patterns
6. Explicitly flag steps where the LLM must NOT be involved and why
7. Reference tool names from Step 3 on every component`}

Return JSON only, no markdown fencing:
{
  "solutionType": "<pattern name>",
  "recommendation": "<full recommendation text>",
  "architectureComponents": [
    {"name": "<component>", "type": "<LLM|deterministic|human|integration>", "tool": "<specific tool from Step 3>", "step": "<which decomposed step(s)>"}
  ]
}`
        }],
      })
      const textBlocks = response.content.filter(b => b.type === 'text')
      const text = textBlocks.map(b => (b as { type: 'text'; text: string }).text).join('').trim()
      let cleaned = text
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      return NextResponse.json(JSON.parse(cleaned))
    }

    // ── Diagram ─────────────────────────────────────────────
    if (step === 'diagram') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `${DIAGRAM_STANDARDS}

Generate an architecture diagram for this workflow automation.

Process: "${context.processDescription}"
Solution type: ${context.solutionType}
Components: ${JSON.stringify(context.architectureComponents, null, 2)}

IMPORTANT visual distinction by component type:
- LLM-powered: purple nodes with "AI" subtitle
- Deterministic code: green nodes with "Code" subtitle
- Human review: amber nodes with "Human" subtitle
- Integration/API: teal nodes
- Data sources: coral nodes

Show tool names on every node. This teaches the user where the LLM is vs isn't involved.

Return ONLY SVG code. Start with <svg, end with </svg>.`
        }],
      })
      let svg = (response.content[0] as { type: string; text: string }).text.trim()
      if (svg.startsWith('```')) svg = svg.replace(/^```(?:svg|xml)?\n?/, '').replace(/\n?```$/, '')
      const svgStart = svg.indexOf('<svg')
      if (svgStart > 0) svg = svg.slice(svgStart)
      const svgEnd = svg.lastIndexOf('</svg>')
      if (svgEnd > 0) svg = svg.slice(0, svgEnd + 6)
      return NextResponse.json({ svg })
    }

    // ── Step 5: Implement ───────────────────────────────────
    if (step === 'implement') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 2 }],
        messages: [{
          role: 'user',
          content: `You are a senior AI architect creating an implementation plan. The user's technical level: ${comfortLabel(context.technicalComfort)}. Calibrate detail accordingly.

Process: "${context.processDescription}"
Solution type: ${context.solutionType}
Recommendation: ${context.recommendation}
Components: ${JSON.stringify(context.architectureComponents, null, 2)}
Recommended tools: ${JSON.stringify(context.tooling, null, 2)}
Steps: ${JSON.stringify(context.decomposition, null, 2)}

Search the web for current setup guides and pricing.

${express ? 'Express mode — focus on "Start here" instructions and the Claude Code prompt. Be concise.' : ''}

Create a plan using the SPECIFIC TOOLS recommended in Step 3:

1. **Technology choices** with justification (referencing Step 3 reasoning)
2. **Key libraries** with install commands
3. **Pseudocode or prompt templates** for each component
4. **"Start here" instructions** — literal first steps: "Open Claude Code. Create a project directory. Create a CLAUDE.md with this content: [content]. Tell Claude Code: [exact instruction]."
5. **Error handling** — what happens when things fail
6. **Observability** — monitoring from day one (if LLM calls exist)
7. **Iteration plan** — what to test first, what needs tuning
8. **Maintenance checklist** — weekly checks

For deterministic computation steps: specific formulas/logic in pseudocode.
For LLM steps: actual prompt templates.
For file manipulation: exact library and approach.

Format with clear markdown headers and code blocks.`
        }],
      })
      const textBlocks = response.content.filter(b => b.type === 'text')
      const text = textBlocks.map(b => (b as { type: 'text'; text: string }).text).join('')
      return NextResponse.json({ plan: text })
    }

    // ── Step 6: Lesson ──────────────────────────────────────
    if (step === 'lesson') {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Wrap up a workflow automation consultation. Be specific to THIS workflow.

Process: "${context.processDescription}"
Solution: ${context.solutionType}
Steps: ${context.decomposition?.length || 0}
Deterministic accuracy: ${context.deterministicAccuracy}
Tools recommended: ${(context.tooling || []).map((t: { tool: string }) => t.tool).join(', ')}

Write "What you just learned" (3-4 paragraphs):
1. The transferable framework: decompose → classify step types → identify where LLMs help vs are dangerous → recommend tooling → match to architecture pattern → validate
2. 2-3 specific decisions that illustrate broader principles
3. Connection to Architecture Lab concepts
4. Tooling decision highlights: why specific tools were chosen over alternatives
5. "Next time you encounter a manual process, start by asking: what kind of work is each step?"

Be specific, not generic.`
        }],
      })
      return NextResponse.json({ lesson: (response.content[0] as { type: string; text: string }).text })
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  } catch (error) {
    console.error('Workflow API error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
