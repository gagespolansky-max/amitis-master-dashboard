"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface CalendarEvent {
  id: string | null
  summary: string
  description: string | null
  start: string | null
  end: string | null
  all_day: boolean
  location: string | null
  organizer_email: string | null
  attendees: Array<{ email: string; name: string | null; response_status: string | null }>
  hangout_link: string | null
  html_link: string | null
  status: string | null
}

interface CalendarResponse {
  count: number
  time_min: string
  time_max: string
  events: CalendarEvent[]
  needs_reauth?: boolean
  error?: string
}

interface CalendarGridProps {
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>, toggled: CalendarEvent | null) => void
  onActiveChange: (event: CalendarEvent | null) => void
  refreshTick: number
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const day = out.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  out.setDate(out.getDate() + diff)
  return out
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function fmtTime(d: Date): string {
  // Deterministic 12-hour format, identical on server and client.
  const h24 = d.getHours()
  const m = d.getMinutes()
  const ampm = h24 >= 12 ? "PM" : "AM"
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return m === 0 ? `${h} ${ampm}` : `${h}:${m.toString().padStart(2, "0")} ${ampm}`
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function fmtMonthDay(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function fmtMonthDayYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function CalendarGrid({
  selectedIds,
  onSelectionChange,
  onActiveChange,
  refreshTick,
}: CalendarGridProps) {
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

  useEffect(() => {
    void load(weekStart)
  }, [weekStart, refreshTick])

  async function load(start: Date) {
    setLoading(true)
    setError(null)
    try {
      const end = addDays(start, 7)
      const params = new URLSearchParams({
        time_min: start.toISOString(),
        time_max: end.toISOString(),
      })
      const res = await fetch(`/oig/cos/api/calendar?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as CalendarResponse
      setData(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar")
    } finally {
      setLoading(false)
    }
  }

  const days = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i))
    return arr
  }, [weekStart])

  const eventsByDay = useMemo(() => {
    const out: CalendarEvent[][] = days.map(() => [])
    for (const e of data?.events ?? []) {
      if (!e.start) continue
      const s = new Date(e.start)
      for (let i = 0; i < days.length; i++) {
        if (sameDay(s, days[i])) {
          out[i].push(e)
          break
        }
      }
    }
    for (const list of out) {
      list.sort((a, b) => Date.parse(a.start ?? "") - Date.parse(b.start ?? ""))
    }
    return out
  }, [data, days])

  function toggleSelected(id: string | null, event: CalendarEvent) {
    if (!id) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next, event)
    onActiveChange(next.size === 1 ? event : null)
  }

  if (data?.needs_reauth) {
    return (
      <Card className="px-4 py-3">
        <div className="text-sm font-medium text-amber-300">Calendar access not granted yet</div>
        <p className="text-[12px] text-amber-200/80">
          Sign out and back in to grant <code className="text-[11px]">calendar.readonly</code>.
          Make sure the Google Calendar API is enabled and the scope is added in Google Cloud
          Console first.
        </p>
        <a
          href="/logout"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-2 w-fit",
          )}
        >
          Sign out → reconnect
        </a>
      </Card>
    )
  }

  const today = new Date()
  const weekLabel = `${fmtMonthDay(weekStart)} – ${fmtMonthDayYear(addDays(weekStart, 6))}`

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold">Week</h2>
          <span className="text-xs text-muted-foreground">{weekLabel}</span>
          {loading && (
            <span className="text-[10px] text-muted-foreground/60 italic">refreshing…</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-[12px] text-destructive border-b border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-7 gap-px bg-border min-h-[420px]">
        {days.map((day, idx) => {
          const isToday = sameDay(day, today)
          const list = eventsByDay[idx]
          return (
            <div key={idx} className="bg-card flex flex-col">
              <div
                className={cn(
                  "px-2 py-1.5 text-[10px] uppercase tracking-wide border-b border-border flex items-baseline justify-between",
                  isToday ? "bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                <span>{DAY_LABELS[idx]}</span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    isToday ? "text-primary" : "text-foreground/80",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <ScrollArea className="flex-1 min-h-[360px]">
                <div className="p-1.5 space-y-1.5">
                  {loading && list.length === 0 && (
                    <>
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </>
                  )}
                  {!loading && list.length === 0 && (
                    <div className="text-[10px] text-muted-foreground/40 italic px-1">—</div>
                  )}
                  {list.map((e) => (
                    <MeetingCard
                      key={(e.id ?? "") + (e.start ?? "")}
                      event={e}
                      selected={!!e.id && selectedIds.has(e.id)}
                      onToggle={() => toggleSelected(e.id, e)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function MeetingCard({
  event,
  selected,
  onToggle,
}: {
  event: CalendarEvent
  selected: boolean
  onToggle: () => void
}) {
  const start = event.start ? new Date(event.start) : null
  const end = event.end ? new Date(event.end) : null
  const now = new Date()
  const isPast = end ? end < now : false
  const isLive = start && end ? start <= now && now <= end : false

  const externalCount = event.attendees.filter(
    (a) => a.email && !a.email.toLowerCase().endsWith("@amitiscapital.com"),
  ).length

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left rounded-md border px-2 py-1.5 text-[11px] leading-tight transition-colors",
        selected
          ? "bg-primary/20 border-primary text-foreground"
          : isLive
            ? "bg-primary/10 border-primary/30 text-foreground hover:bg-primary/15"
            : isPast
              ? "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              : "bg-card border-border text-foreground hover:border-foreground/30",
      )}
    >
      <div className="flex items-start gap-1.5">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-3 w-3 shrink-0"
          aria-label={`Select ${event.summary}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-muted-foreground/90 truncate flex items-center gap-1">
            <span>{event.all_day ? "All day" : start ? fmtTime(start) : "—"}</span>
            {isLive && (
              <Badge variant="default" className="h-3.5 px-1 text-[8px] uppercase">
                Live
              </Badge>
            )}
          </div>
          <div className="font-medium truncate">{event.summary}</div>
          {externalCount > 0 && (
            <div className="text-[9.5px] text-muted-foreground/70 truncate">
              {externalCount} ext.
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
