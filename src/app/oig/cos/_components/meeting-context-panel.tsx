"use client"

import { useEffect, useState } from "react"
import { X, Sparkles, MessageSquare, MailPlus, ExternalLink, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { CalendarEvent } from "./calendar-grid"

interface ContextResponse {
  action_items: ActionItemRead[]
  interactions: InteractionRead[]
  findings: AuditFindingRead[]
  counts: { action_items: number; interactions: number; findings: number }
}

interface ActionItemRead {
  id: string
  title: string
  status: string
  priority: string | null
  due_date: string | null
  owner_name: string | null
  owner_email: string | null
  organization_name: string | null
}

interface InteractionRead {
  id: string
  source_type: string
  thread_id: string | null
  occurred_at: string
  title: string | null
  clean_summary: string | null
  organization_name: string | null
  primary_person_name: string | null
  primary_person_email: string | null
  open_action_items_count: number
}

interface AuditFindingRead {
  id: string
  finding_type: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  details: string | null
  related_action_item_title: string | null
  related_person_name: string | null
  related_org_name: string | null
}

interface MeetingContextPanelProps {
  event: CalendarEvent
  onAskPrep: (prompt: string) => void
  onAskFollowup: (prompt: string) => void
  onAskCustom: (prompt: string) => void
  onClose: () => void
}

function inferDomain(event: CalendarEvent): string {
  const ext = event.attendees
    .map((a) => a.email)
    .filter((e) => e && !e.toLowerCase().endsWith("@amitiscapital.com"))
  for (const e of ext) {
    const at = e.indexOf("@")
    if (at >= 0) return e.slice(at + 1).toLowerCase()
  }
  return ""
}

function fmtRange(event: CalendarEvent): string {
  if (!event.start) return ""
  const s = new Date(event.start)
  const e = event.end ? new Date(event.end) : null
  const day = s.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
  if (event.all_day) return `${day} · all day`
  const time = s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (!e) return `${day} · ${time}`
  return `${day} · ${time} – ${e.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}

export default function MeetingContextPanel({
  event,
  onAskPrep,
  onAskFollowup,
  onAskCustom,
  onClose,
}: MeetingContextPanelProps) {
  const [data, setData] = useState<ContextResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [event.id])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const emails = event.attendees
        .map((a) => a.email)
        .filter((e) => e && !e.toLowerCase().endsWith("@amitiscapital.com"))
        .join(",")
      const domain = inferDomain(event)
      const params = new URLSearchParams({ emails, domain })
      const res = await fetch(`/oig/cos/api/meeting-context?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as ContextResponse
      setData(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load context")
    } finally {
      setLoading(false)
    }
  }

  const externalAttendees = event.attendees.filter(
    (a) => a.email && !a.email.toLowerCase().endsWith("@amitiscapital.com"),
  )

  const now = new Date()
  const endMs = event.end ? Date.parse(event.end) : NaN
  const isPast = !Number.isNaN(endMs) && endMs < now.getTime()

  function buildPrep() {
    return (
      `Help me prepare for "${event.summary}" — ${fmtRange(event)}. ` +
      `External attendees: ${externalAttendees.map((a) => a.name || a.email).join(", ") || "(none)"}. ` +
      `Pull recent context, open commitments, and likely talking points from OIG memory. Drill into Gmail only if needed.`
    )
  }
  function buildFollowup() {
    return (
      `The meeting "${event.summary}" just ended. Summarize the discussion and suggest follow-ups: ` +
      `(1) action items I now own, (2) anything I committed to send, (3) a draft follow-up email if appropriate. ` +
      `Use OIG memory and pull the relevant Gmail threads if useful.`
    )
  }

  return (
    <Card size="sm" className="h-full gap-0 py-0">
      <CardHeader className="px-4 pt-3 pb-2 border-b border-border">
        <CardDescription className="text-[10px] uppercase tracking-wide">
          Selected meeting
        </CardDescription>
        <CardTitle className="text-sm leading-tight truncate">{event.summary}</CardTitle>
        <div className="text-[11px] text-muted-foreground">{fmtRange(event)}</div>
        <CardAction>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Clear selection">
            <X />
          </Button>
        </CardAction>
      </CardHeader>

      <ScrollArea className="flex-1 min-h-0 max-h-[480px]">
        <CardContent className="px-4 py-3 space-y-4">
          {externalAttendees.length > 0 && (
            <Section title="Attendees" count={externalAttendees.length}>
              <ul className="space-y-1">
                {externalAttendees.map((a) => (
                  <li key={a.email} className="text-[12px] leading-snug">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-foreground">{a.name || a.email.split("@")[0]}</span>
                      <span className="text-muted-foreground/80">{a.email}</span>
                      {a.response_status && a.response_status !== "needsAction" && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase">
                          {a.response_status}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(event.location || event.hangout_link) && (
            <Section title="Where">
              <div className="space-y-1 text-[12px]">
                {event.location && <div className="text-foreground/90">{event.location}</div>}
                {event.hangout_link && (
                  <a
                    href={event.hangout_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Video className="h-3 w-3" /> Google Meet
                  </a>
                )}
              </div>
            </Section>
          )}

          <Section
            title="Open action items"
            count={data?.counts.action_items}
            loading={loading}
            empty={data?.action_items.length === 0 ? "Nothing open tied to these attendees." : null}
          >
            <div className="divide-y divide-border/60">
              {data?.action_items.map((a) => (
                <div key={a.id} className="text-[12px] py-1.5">
                  <div className="flex items-baseline gap-2">
                    <PriorityDot p={a.priority} />
                    <span className="font-medium text-foreground">{a.title}</span>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground/80 mt-0.5">
                    {a.organization_name && `${a.organization_name} · `}
                    {a.owner_name && `Owner: ${a.owner_name} · `}
                    {a.due_date ? `Due ${a.due_date}` : "No due date"}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Recent interactions"
            count={data?.counts.interactions}
            loading={loading}
            empty={data?.interactions.length === 0 ? "No recent interactions in OIG." : null}
          >
            <div className="divide-y divide-border/60">
              {data?.interactions.slice(0, 6).map((i) => (
                <div key={i.id} className="text-[12px] py-1.5">
                  <div className="font-medium text-foreground truncate">{i.title || "(no title)"}</div>
                  <div className="text-[10.5px] text-muted-foreground/80 mt-0.5">
                    {new Date(i.occurred_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                    {i.organization_name && ` · ${i.organization_name}`}
                    {i.open_action_items_count > 0 && ` · ${i.open_action_items_count} open`}
                  </div>
                  {i.clean_summary && (
                    <div className="text-[11px] text-muted-foreground/90 mt-1 line-clamp-2">
                      {i.clean_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {(data?.findings.length ?? 0) > 0 && (
            <Section title="Risks / audit findings" count={data?.counts.findings} loading={loading}>
              <div className="divide-y divide-border/60">
                {data?.findings.map((f) => (
                  <div key={f.id} className="text-[12px] py-1.5">
                    <div className="flex items-baseline gap-2">
                      <SeverityDot s={f.severity} />
                      <span className="font-medium text-foreground">{f.title}</span>
                    </div>
                    {f.details && (
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5">{f.details}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {error && <div className="text-[12px] text-destructive">{error}</div>}
        </CardContent>
      </ScrollArea>

      <CardFooter className="border-t bg-card/50 px-3 py-2 gap-2 flex-wrap">
        {!isPast ? (
          <Tooltip>
            <TooltipTrigger render={(p) => (
              <Button variant="default" size="sm" onClick={() => onAskPrep(buildPrep())} {...p}>
                <Sparkles /> Prep meeting
              </Button>
            )} />
            <TooltipContent>Send context + talking points to chat</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger render={(p) => (
              <Button variant="default" size="sm" onClick={() => onAskFollowup(buildFollowup())} {...p}>
                <MailPlus /> Draft follow-up
              </Button>
            )} />
            <TooltipContent>Summarize and propose follow-ups</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger render={(p) => (
            <Button variant="outline" size="sm" onClick={() => onAskCustom(`About "${event.summary}" — `)} {...p}>
              <MessageSquare /> Ask about this
            </Button>
          )} />
          <TooltipContent>Pre-fill the chat box</TooltipContent>
        </Tooltip>
        {event.html_link && (
          <a
            href={event.html_link}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Open in Calendar <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardFooter>
    </Card>
  )
}

function Section({
  title,
  count,
  loading,
  empty,
  children,
}: {
  title: string
  count?: number
  loading?: boolean
  empty?: string | null
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</h3>
        {typeof count === "number" && (
          <span className="text-[10px] text-muted-foreground/60">{count}</span>
        )}
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : empty ? (
        <div className="text-[11px] text-muted-foreground/60 italic">{empty}</div>
      ) : (
        children
      )}
    </div>
  )
}

function PriorityDot({ p }: { p: string | null }) {
  const color =
    p === "critical" || p === "high"
      ? "bg-red-400"
      : p === "medium"
        ? "bg-amber-400"
        : p === "low"
          ? "bg-foreground/30"
          : "bg-foreground/20"
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

function SeverityDot({ s }: { s: string }) {
  const color =
    s === "critical"
      ? "bg-red-500"
      : s === "high"
        ? "bg-orange-400"
        : s === "medium"
          ? "bg-amber-400"
          : "bg-foreground/30"
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

// Separator import is not used directly in this file but kept available for future tweaks.
void Separator
