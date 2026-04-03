"use client"

import { useState, useEffect } from "react"

interface ContentPreviewProps {
  filePath: string
}

export default function ContentPreview({ filePath }: ContentPreviewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setContent(null)
    setError(null)
    fetch(`/skills/admin/system-directory/api/content?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setContent(data.content)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [filePath])

  if (loading) {
    return <div className="text-xs text-muted py-2">Loading file content...</div>
  }
  if (error) {
    return <div className="text-xs text-red-400 py-2">Error: {error}</div>
  }

  return (
    <pre className="text-xs font-mono text-foreground/80 bg-background border border-card-border rounded-lg p-3 overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
      {content}
    </pre>
  )
}
