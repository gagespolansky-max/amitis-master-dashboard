import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { question, entryName, fileContent, relatedContent } = await request.json()

    if (!question || !entryName || !fileContent) {
      return NextResponse.json({ error: "question, entryName, and fileContent are required" }, { status: 400 })
    }

    let contextBlock = `# ${entryName}\n\n${fileContent}`

    if (relatedContent && Array.isArray(relatedContent)) {
      for (const related of relatedContent) {
        contextBlock += `\n\n---\n\n# ${related.name}\n\n${related.content}`
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: "You are explaining agents and skills in Gage's Claude Code setup. Answer concisely (2-3 sentences). You have the full file content for context. Be specific, not generic.",
      messages: [
        {
          role: "user",
          content: `Context:\n\n${contextBlock}\n\nQuestion: ${question}`,
        },
      ],
    })

    const answer = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")

    return NextResponse.json({ answer })
  } catch (error) {
    console.error("Ask API error:", error)
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 })
  }
}
