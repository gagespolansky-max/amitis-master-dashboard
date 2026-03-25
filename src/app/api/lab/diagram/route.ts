import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { DIAGRAM_STANDARDS } from '@/lib/lab-types'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { agents, delegationProtocol, title, humanCheckpoints, memoryStrategy } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${DIAGRAM_STANDARDS}

Generate an SVG architecture diagram for this system:

Title: ${title || 'System Architecture'}

Agents:
${agents.map((a: { name: string; modelTier: string; tools: string[]; responsibilities: string; reportsTo: string }) =>
  `- ${a.name} (${a.modelTier}): ${a.responsibilities}. Tools: ${a.tools.join(', ')}. Reports to: ${a.reportsTo}`
).join('\n')}

Delegation Protocol: ${delegationProtocol}
${humanCheckpoints ? `Human Checkpoints: ${humanCheckpoints}` : ''}
${memoryStrategy ? `Memory Strategy: ${memoryStrategy}` : ''}

Return ONLY the SVG code, nothing else. No markdown fencing. Start with <svg and end with </svg>.`
      }],
    })

    let svg = (response.content[0] as { type: string; text: string }).text.trim()
    if (svg.startsWith('```')) {
      svg = svg.replace(/^```(?:svg|xml)?\n?/, '').replace(/\n?```$/, '')
    }

    // Ensure it starts with <svg
    const svgStart = svg.indexOf('<svg')
    if (svgStart > 0) svg = svg.slice(svgStart)
    const svgEnd = svg.lastIndexOf('</svg>')
    if (svgEnd > 0) svg = svg.slice(0, svgEnd + 6)

    return NextResponse.json({ svg })
  } catch (error) {
    console.error('Diagram generation error:', error)
    return NextResponse.json({ svg: '' }, { status: 200 })
  }
}
