"use client"

import { useRef, useState } from "react"
import { RefreshCw, X, Sparkles, MailPlus, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import CalendarGrid, { type CalendarEvent } from "./calendar-grid"
import MeetingContextPanel from "./meeting-context-panel"
import ChatShell, { type ChatShellHandle, type ChatMode } from "./chat-shell"
import TriagePanel from "../../triage/_components/triage-panel"

export default function CosWorkspace() {
  const chatRef = useRef<ChatShellHandle | null>(null)
  const [mode, setMode] = useState<ChatMode>("ephemeral")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const [eventCache, setEventCache] = useState<Map<string, CalendarEvent>>(new Map())
  const [showTriage, setShowTriage] = useState(false)
  const [triageRefreshTick, setTriageRefreshTick] = useState(0)

  function handleSelectionChange(ids: Set<string>, toggled: CalendarEvent | null) {
    setSelectedIds(ids)
    if (toggled?.id) {
      const next = new Map(eventCache)
      next.set(toggled.id, toggled)
      setEventCache(next)
    }
    if (ids.size !== 1) setActiveEvent(null)
  }

  function handleActiveChange(ev: CalendarEvent | null) {
    setActiveEvent(ev)
    if (ev?.id) {
      const next = new Map(eventCache)
      next.set(ev.id, ev)
      setEventCache(next)
    }
  }

  function ask(prompt: string) {
    chatRef.current?.ask(prompt)
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setActiveEvent(null)
  }

  function bulkPrep() {
    const events = collectSelected()
    if (events.length === 0) return
    const lines = events.map((e) => `• ${e.summary} — ${fmtRange(e)}`).join("\n")
    ask(
      `I have ${events.length} meetings selected. Prep me for each:\n\n${lines}\n\nFor each meeting: pull recent context, open commitments, talking points. Use OIG memory; only drill into Gmail if needed.`,
    )
  }

  function bulkFollowup() {
    const events = collectSelected()
    if (events.length === 0) return
    const lines = events.map((e) => `• ${e.summary} — ${fmtRange(e)}`).join("\n")
    ask(
      `For each of these ${events.length} meetings, summarize and propose follow-ups (action items, commitments, draft email if appropriate):\n\n${lines}`,
    )
  }

  function bulkAsk() {
    const events = collectSelected()
    if (events.length === 0) return
    chatRef.current?.draftQuestion(
      `About these ${events.length} meetings (${events.map((e) => e.summary).join(", ")}) — `,
    )
  }

  function collectSelected(): CalendarEvent[] {
    const out: CalendarEvent[] = []
    for (const id of selectedIds) {
      const e = eventCache.get(id)
      if (e) out.push(e)
    }
    return out
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Mode
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        {mode === "structured" && (
          <Tooltip>
            <TooltipTrigger render={(p) => (
              <Button
                variant={showTriage ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowTriage((v) => !v)}
                {...p}
              >
                <RefreshCw /> {showTriage ? "Hide Triage" : "Refresh memory"}
              </Button>
            )} />
            <TooltipContent>Run Triage to pull the latest Gmail into OIG memory.</TooltipContent>
          </Tooltip>
        )}
      </header>

      {showTriage && (
        <Card size="sm" className="px-4 py-3">
          <CardContent className="px-0">
            <TriagePanel />
            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-2">
              <span>
                Tip: Triage updates OIG memory. Vercel Cron will automate this in Phase 7.
              </span>
              <button
                onClick={() => setTriageRefreshTick((n) => n + 1)}
                className="underline hover:text-foreground"
              >
                Refresh calendar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <CalendarGrid
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        onActiveChange={handleActiveChange}
        refreshTick={triageRefreshTick}
      />

      {selectedIds.size >= 2 && (
        <BulkActionBar
          count={selectedIds.size}
          onPrep={bulkPrep}
          onFollowup={bulkFollowup}
          onAsk={bulkAsk}
          onClear={clearSelection}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,420px)_1fr] gap-4">
        <div className="h-[640px]">
          {activeEvent ? (
            <MeetingContextPanel
              event={activeEvent}
              onAskPrep={(p) => ask(p)}
              onAskFollowup={(p) => ask(p)}
              onAskCustom={(p) => chatRef.current?.draftQuestion(p)}
              onClose={clearSelection}
            />
          ) : (
            <PlaceholderPanel selectedCount={selectedIds.size} onAsk={ask} />
          )}
        </div>
        <ChatShell ref={chatRef} mode={mode} />
      </div>
    </div>
  )
}

function BulkActionBar({
  count,
  onPrep,
  onFollowup,
  onAsk,
  onClear,
}: {
  count: number
  onPrep: () => void
  onFollowup: () => void
  onAsk: () => void
  onClear: () => void
}) {
  return (
    <Card size="sm" className="px-4 py-2.5 flex-row items-center gap-3 flex-wrap">
      <Badge variant="default">{count} selected</Badge>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="default" size="sm" onClick={onPrep}>
          <Sparkles /> Prep selected
        </Button>
        <Button variant="default" size="sm" onClick={onFollowup}>
          <MailPlus /> Generate follow-ups
        </Button>
        <Button variant="outline" size="sm" onClick={onAsk}>
          <MessageSquare /> Ask CoS
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto text-muted-foreground"
      >
        <X /> Clear
      </Button>
    </Card>
  )
}

function PlaceholderPanel({
  selectedCount,
  onAsk,
}: {
  selectedCount: number
  onAsk: (prompt: string) => void
}) {
  const QUICK = [
    { label: "Daily brief", prompt: "Give me my daily brief — calendar, open action items, anything overdue or at risk." },
    { label: "What's overdue?", prompt: "What action items are overdue or at risk right now? Order by severity." },
    { label: "What's at risk?", prompt: "Walk me through the open audit findings and any relationships I'm dropping the ball on." },
    { label: "Meetings today", prompt: "Summarize my meetings today and what I should be thinking about for each." },
  ]
  return (
    <Card size="sm" className="h-full gap-3 py-4">
      <CardContent className="space-y-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Context panel
        </div>
        <div className="text-[12.5px] text-muted-foreground leading-relaxed">
          {selectedCount === 0 ? (
            <>
              Tick a meeting in the grid to see attendees, open commitments, recent interactions,
              and risks tied to it. Tick multiple to bulk-prep or bulk-follow-up.
            </>
          ) : (
            <>
              {selectedCount} meetings selected. Use the bulk action bar above, or pick a single
              meeting to load its full context.
            </>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Quick prompts
          </div>
          <div className="flex flex-col gap-1.5">
            {QUICK.map((q) => (
              <Button
                key={q.label}
                variant="outline"
                size="sm"
                onClick={() => onAsk(q.prompt)}
                className="justify-start"
              >
                {q.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ChatMode
  onChange: (m: ChatMode) => void
}) {
  const options: { value: ChatMode; label: string; sub: string }[] = [
    { value: "ephemeral", label: "Ephemeral", sub: "live calendar + Gmail · no memory" },
    { value: "structured", label: "Structured", sub: "OIG memory + Triage" },
  ]
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {options.map((o) => (
        <Tooltip key={o.value}>
          <TooltipTrigger render={(p) => (
            <button
              type="button"
              onClick={() => onChange(o.value)}
              className={
                "px-2.5 py-1 rounded text-[11px] font-medium transition-colors " +
                (mode === o.value
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground")
              }
              {...p}
            >
              {o.label}
            </button>
          )} />
          <TooltipContent>{o.sub}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

function fmtRange(event: CalendarEvent): string {
  if (!event.start) return ""
  const s = new Date(event.start)
  const day = s.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
  if (event.all_day) return `${day} all day`
  return `${day} ${s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}
