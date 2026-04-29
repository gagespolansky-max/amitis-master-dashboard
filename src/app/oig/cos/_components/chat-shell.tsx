"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface ChatShellHandle {
  ask: (prompt: string) => void
  draftQuestion: (prompt: string) => void
  newConversation: () => void
}

export type ChatMode = "structured" | "ephemeral"

export interface ChatShellProps {
  mode: ChatMode
}

interface ConversationSummary {
  id: string
  title: string | null
  agent_slug: string
  created_at: string
  updated_at: string
}

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown; is_error?: boolean }

interface RawMessage {
  role: "user" | "assistant"
  content: string | AnthropicBlock[]
}

interface DisplayMessage {
  role: "user" | "assistant"
  text: string
  toolNames: string[]
}

function flatten(messages: RawMessage[]): DisplayMessage[] {
  const out: DisplayMessage[] = []
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, text: m.content, toolNames: [] })
      continue
    }
    if (m.role === "user") {
      const isOnlyToolResults = m.content.every((b) => b.type === "tool_result")
      if (isOnlyToolResults) continue
      const text = m.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n")
      if (text) out.push({ role: "user", text, toolNames: [] })
      continue
    }
    const text = m.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
    const toolNames = m.content
      .filter((b): b is { type: "tool_use"; id: string; name: string; input: unknown } => b.type === "tool_use")
      .map((b) => b.name)
    if (text || toolNames.length) out.push({ role: "assistant", text, toolNames })
  }
  return out
}

const ChatShell = forwardRef<ChatShellHandle, ChatShellProps>(function ChatShell(props, ref) {
  const mode = props.mode
  const modeRef = useRef<ChatMode>(mode)
  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const sendingRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    void refreshConversationList()
  }, [])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    sendingRef.current = sending
  }, [sending])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length, sending])

  useImperativeHandle(
    ref,
    () => ({
      ask(prompt: string) {
        if (!prompt.trim() || sendingRef.current) return
        void sendDirect(prompt.trim())
      },
      draftQuestion(prompt: string) {
        setInput(prompt)
        setTimeout(() => textareaRef.current?.focus(), 0)
      },
      newConversation,
    }),
    [],
  )

  async function refreshConversationList() {
    try {
      const res = await fetch("/oig/cos/api/conversation")
      if (!res.ok) return
      const data = (await res.json()) as { conversations: ConversationSummary[] }
      setConversations(data.conversations)
    } catch {
      // silent
    }
  }

  async function selectConversation(id: string) {
    if (id === conversationId) return
    setLoadingHistory(true)
    setError(null)
    try {
      const res = await fetch(`/oig/cos/api/conversation?id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error(`Load failed (${res.status})`)
      const data = (await res.json()) as { messages: RawMessage[] }
      setConversationId(id)
      setMessages(flatten(data.messages))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoadingHistory(false)
    }
  }

  function newConversation() {
    setConversationId(null)
    setMessages([])
    setError(null)
    setInput("")
  }

  async function sendMessage() {
    const content = input.trim()
    if (!content) return
    setInput("")
    await sendDirect(content)
  }

  async function sendDirect(content: string) {
    if (!content || sendingRef.current) return
    setError(null)
    setSending(true)
    sendingRef.current = true
    setMessages((prev) => [...prev, { role: "user", text: content, toolNames: [] }])

    try {
      const res = await fetch("/oig/cos/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationIdRef.current,
          content,
          mode: modeRef.current,
        }),
      })
      const data = (await res.json()) as {
        conversation_id: string
        is_new_conversation: boolean
        final_message: string
        iterations: number
        stop_reason: string
        duration_ms: number
        error?: string
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

      setConversationId(data.conversation_id)
      conversationIdRef.current = data.conversation_id
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.final_message, toolNames: [] },
      ])
      if (data.error) setError(data.error)
      void refreshConversationList()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <Card size="sm" className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0 py-0 h-[640px] overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-border bg-card/40">
        <div className="p-2.5 border-b border-border">
          <Button variant="default" size="sm" onClick={newConversation} className="w-full">
            <Plus /> New conversation
          </Button>
        </div>
        <div className="px-3 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          Recent
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-0.5">
            {conversations.length === 0 && (
              <div className="text-[11px] text-muted-foreground/70 italic px-1">
                No conversations yet
              </div>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md text-[12px] transition-colors",
                  c.id === conversationId
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
                title={c.title ?? "Untitled"}
              >
                <div className="truncate">{c.title ?? "Untitled"}</div>
                <div className="text-[10px] text-muted-foreground/60">
                  {new Date(c.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main */}
      <div className="flex flex-col min-h-0">
        <CardHeader className="px-4 py-2.5 border-b border-border flex-row items-center gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Chief of Staff
            <Badge
              variant={mode === "ephemeral" ? "default" : "outline"}
              className="h-4 px-1.5 text-[9px] uppercase"
            >
              {mode}
            </Badge>
            {conversationId && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase">
                continuing
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loadingHistory && (
            <div className="text-[12px] text-muted-foreground">Loading conversation…</div>
          )}
          {!loadingHistory && messages.length === 0 && (
            <div className="text-[13px] text-muted-foreground/80 max-w-md leading-relaxed">
              Ask for a daily brief, surface overdue items, or prep for a meeting. Click a meeting
              card on the calendar to load its context here, then prep or follow up in one click.
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {sending && (
            <div className="text-[12px] text-muted-foreground/80 font-mono">
              <span className="inline-block animate-pulse">⏺</span> Thinking…
            </div>
          )}
        </div>

        {error && (
          <div className="text-[12px] text-destructive bg-destructive/10 border-t border-destructive/20 px-4 py-2">
            {error}
          </div>
        )}

        <CardFooter className="bg-card/40 border-t border-border p-3 flex-col items-stretch gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={2}
            placeholder="Ask for a daily brief, meeting prep, overdue items… (⌘+Enter to send)"
            className="resize-none min-h-[60px]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/70">
              {conversationId ? "Continuing conversation" : "New conversation"}
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => void sendMessage()}
              disabled={sending || !input.trim()}
            >
              {sending ? "Sending…" : (
                <>
                  <Send /> Send
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </div>
    </Card>
  )
})

export default ChatShell

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary/15 text-foreground border border-primary/30"
            : "bg-card border border-border text-foreground",
        )}
      >
        {message.toolNames.length > 0 && !message.text && (
          <div className="text-[11px] text-muted-foreground italic">
            Used {message.toolNames.length} tool{message.toolNames.length === 1 ? "" : "s"}:{" "}
            {message.toolNames.join(", ")}
          </div>
        )}
        {message.text && (
          <div className="prose-cos">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                h1: ({ children }) => (
                  <h3 className="text-[15px] font-semibold mt-2 mb-1">{children}</h3>
                ),
                h2: ({ children }) => (
                  <h3 className="text-[14px] font-semibold mt-2 mb-1">{children}</h3>
                ),
                h3: ({ children }) => (
                  <h4 className="text-[13px] font-semibold mt-2 mb-1">{children}</h4>
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-foreground/10 border border-border rounded px-1 py-0.5 text-[11px] font-mono">
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
