"use client"

import { useState } from "react"
import { DealEmail, EmailMessage } from "../_lib/types"
import { ChevronDown, ChevronRight, ExternalLink, Loader2, ArrowRightLeft, GripVertical } from "lucide-react"

interface EmailThreadProps {
  dealEmail: DealEmail
  dealId: string
  onMove?: (dealEmail: DealEmail) => void
  onMessagesLoaded?: () => void
  showDragHandle?: boolean
}

export default function EmailThread({ dealEmail, dealId, onMove, onMessagesLoaded, showDragHandle }: EmailThreadProps) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null)

  async function loadMessages() {
    if (loaded) {
      setExpanded(!expanded)
      return
    }
    setExpanded(true)
    setLoading(true)
    try {
      const res = await fetch(
        `/acio/deals/api/${dealId}/emails/messages?deal_email_id=${dealEmail.id}&thread_id=${dealEmail.thread_id}`
      )
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        setLoaded(true)
        if (data.length > 0) setExpandedMsgId(data[data.length - 1].id)
        onMessagesLoaded?.()
      }
    } finally {
      setLoading(false)
    }
  }

  const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${dealEmail.thread_id}`

  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      {/* Thread header */}
      <div className="flex items-center">
        {showDragHandle && (
          <div className="pl-2 text-muted/50 hover:text-muted cursor-grab active:cursor-grabbing shrink-0 self-stretch flex items-center">
            <GripVertical size={14} />
          </div>
        )}
        <button
          onClick={loadMessages}
          className="flex-1 px-3 py-2.5 flex items-center gap-2 hover:bg-card-border/20 transition-colors text-left min-w-0"
        >
          {loading ? (
            <Loader2 size={14} className="text-muted animate-spin shrink-0" />
          ) : expanded ? (
            <ChevronDown size={14} className="text-muted shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-muted shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{dealEmail.subject || "No subject"}</div>
            <div className="text-xs text-muted flex gap-2">
              {dealEmail.participants && (
                <span>{dealEmail.participants.length} participant{dealEmail.participants.length !== 1 ? "s" : ""}</span>
              )}
              {dealEmail.last_message_date && (
                <span>{new Date(dealEmail.last_message_date).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 pr-2 shrink-0">
          {onMove && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(dealEmail) }}
              className="p-1.5 text-muted hover:text-accent rounded hover:bg-accent/10 transition-colors"
              title="Move to another deal"
            >
              <ArrowRightLeft size={14} />
            </button>
          )}
          <a
            href={gmailLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-accent hover:text-accent-hover"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Messages list */}
      {expanded && messages.length > 0 && (
        <div className="border-t border-card-border divide-y divide-card-border/50">
          {messages.map((msg) => (
            <div key={msg.id}>
              <button
                onClick={() => setExpandedMsgId(expandedMsgId === msg.id ? null : msg.id)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-card-border/10 text-left"
              >
                {expandedMsgId === msg.id ? (
                  <ChevronDown size={12} className="text-muted shrink-0" />
                ) : (
                  <ChevronRight size={12} className="text-muted shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {msg.from_name || msg.from_email || "Unknown"}
                </span>
                <span className="text-xs text-muted shrink-0">
                  {msg.date ? new Date(msg.date).toLocaleDateString() : ""}
                </span>
              </button>
              {expandedMsgId === msg.id && (
                <div className="px-3 pb-3 pl-8">
                  <div className="text-xs text-muted mb-1">{msg.from_email}</div>
                  <div className="text-sm text-foreground/80 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                    {msg.body_text || msg.snippet || "No content"}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && !loading && messages.length === 0 && loaded && (
        <div className="px-3 py-2 text-xs text-muted border-t border-card-border">
          No messages found
        </div>
      )}
    </div>
  )
}
