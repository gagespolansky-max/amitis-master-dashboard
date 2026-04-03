"use client"

import { useState } from "react"
import type { DirectoryEntry } from "./directory-entry-card"

interface AskSectionProps {
  entry: DirectoryEntry
  allEntries: DirectoryEntry[]
}

export default function AskSection({ entry, allEntries }: AskSectionProps) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk() {
    if (!question.trim()) return
    setLoading(true)
    setAnswer(null)
    setError(null)

    const relatedContent: { name: string; content: string }[] = []
    const refPattern = /\/([a-z][a-z0-9-]+)/g
    let match
    while ((match = refPattern.exec(question)) !== null) {
      const refName = match[1]
      if (refName !== entry.name) {
        const refEntry = allEntries.find((e) => e.name === refName)
        if (refEntry) {
          try {
            const res = await fetch(
              `/skills/admin/system-directory/api/content?path=${encodeURIComponent(refEntry.filePath)}`
            )
            if (res.ok) {
              const data = await res.json()
              relatedContent.push({ name: refName, content: data.content })
            }
          } catch {
            // Skip if can't fetch
          }
        }
      }
    }

    try {
      const contentRes = await fetch(
        `/skills/admin/system-directory/api/content?path=${encodeURIComponent(entry.filePath)}`
      )
      const contentData = contentRes.ok ? await contentRes.json() : { content: entry.description }

      const res = await fetch("/skills/admin/system-directory/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          entryName: entry.name,
          fileContent: contentData.content,
          relatedContent: relatedContent.length > 0 ? relatedContent : undefined,
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setAnswer(data.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get answer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask about this agent or skill..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleAsk()}
          disabled={loading}
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="px-3 py-2 bg-accent text-white text-xs rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
      {loading && (
        <div className="text-xs text-muted mt-2">Thinking...</div>
      )}
      {answer && (
        <div className="text-sm text-foreground mt-3 p-3 bg-background border border-card-border rounded-lg">
          {answer}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400 mt-2">Error: {error}</div>
      )}
    </div>
  )
}
