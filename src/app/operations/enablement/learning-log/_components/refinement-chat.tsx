"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, CheckCircle2, Sparkles } from "lucide-react"
import { LearningLogEntry } from "../_lib/learning-log-types"

export interface SuggestedUpdates {
  concept?: string
  explanation?: string
  content?: string
  category?: string
  tags?: string[]
}

interface RefinementChatProps {
  entry: LearningLogEntry
  onEntryUpdated: (entry: LearningLogEntry) => void
  onVerified: () => void
  onProposedChanges: (updates: SuggestedUpdates) => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export default function RefinementChat({ entry, onEntryUpdated, onVerified, onProposedChanges }: RefinementChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(entry.chat_history || [])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setLoading(true)

    try {
      const res = await fetch(
        "/operations/enablement/learning-log/api/refine",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId: entry.id,
            message: trimmed,
            chatHistory: messages,
            currentContent: {
              concept: entry.concept,
              explanation: entry.explanation,
              content: entry.content,
              category: entry.category,
              tags: entry.tags,
            },
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.error || "Something went wrong"}` },
        ])
        return
      }

      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }])

      if (data.entry) {
        onEntryUpdated(data.entry)
      }

      // Send proposed changes up to the editor for inline display
      if (data.suggested_updates) {
        onProposedChanges(data.suggested_updates)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Failed to reach the server" },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    try {
      const res = await fetch("/operations/enablement/learning-log/api", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, is_verified: true }),
      })
      if (res.ok) {
        const updated = await res.json()
        onEntryUpdated(updated)
        onVerified()
      }
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-3 py-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles size={20} className="mx-auto text-accent mb-2" />
            <p className="text-xs text-muted">
              Ask Claude to review, correct, or expand this entry.
            </p>
            <p className="text-xs text-muted mt-1">
              Proposed changes appear inline above for you to accept or reject.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/20 text-foreground"
                  : "bg-card-bg border border-card-border text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card-bg border border-card-border rounded-lg px-3 py-2">
              <Loader2 size={14} className="animate-spin text-muted" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Verify button */}
      {messages.length > 0 && !entry.is_verified && (
        <div className="px-3 py-2 border-t border-card-border">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-md text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {verifying ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            Mark as Verified Truth
          </button>
        </div>
      )}

      {entry.is_verified && (
        <div className="px-3 py-2 border-t border-card-border">
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 size={12} />
            Verified
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-2 border-t border-card-border space-y-1.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask Claude to review or refine... (Shift+Enter for new line)"
          disabled={loading}
          rows={4}
          className="w-full bg-card-bg border border-card-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50 resize-none leading-relaxed"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5 text-xs"
          >
            <Send size={12} /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
