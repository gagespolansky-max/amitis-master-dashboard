"use client"

import { useMemo, useState } from "react"
import { Check, ExternalLink, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { TranscriptReviewRow } from "@/lib/data-layer/attio-transcripts/memory"

interface TranscriptReviewQueueProps {
  initialTranscripts: TranscriptReviewRow[]
  initialError?: string | null
}

const statusLabels: Record<string, string> = {
  ready_for_review: "Ready",
  needs_human_review: "Needs Review",
  reviewed: "Reviewed",
  ignored: "Ignored",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function getSummary(summary: unknown): string {
  if (!summary || typeof summary !== "object") return ""
  const data = summary as Record<string, unknown>
  const candidates = [data.executive_summary, data.summary, data.short_summary, data.overview]
  return candidates.find((item): item is string => typeof item === "string" && item.trim().length > 0) ?? ""
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null
  } catch {
    return null
  }
}

export default function TranscriptReviewQueue({
  initialTranscripts,
  initialError = null,
}: TranscriptReviewQueueProps) {
  const [transcripts, setTranscripts] = useState(initialTranscripts)
  const [selectedId, setSelectedId] = useState(initialTranscripts[0]?.id ?? null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError)
  const selected = useMemo(
    () => transcripts.find((transcript) => transcript.id === selectedId) ?? transcripts[0] ?? null,
    [selectedId, transcripts],
  )
  const selectedSourceUrl = safeExternalUrl(selected?.source_url ?? null)

  async function refresh() {
    setBusyId("refresh")
    setError(null)
    try {
      const res = await fetch("/data-layer/attio-transcripts/api/review", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load review queue")
      const next = data.transcripts as TranscriptReviewRow[]
      setTranscripts(next)
      setSelectedId(next[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue")
    } finally {
      setBusyId(null)
    }
  }

  async function review(transcriptId: string, action: "approve" | "ignore") {
    setBusyId(transcriptId)
    setError(null)
    try {
      const res = await fetch("/data-layer/attio-transcripts/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript_id: transcriptId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to update transcript")
      const next = transcripts.filter((transcript) => transcript.id !== transcriptId)
      setTranscripts(next)
      if (selectedId === transcriptId) setSelectedId(next[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update transcript")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid min-h-[640px] grid-cols-[minmax(280px,360px)_1fr] overflow-hidden rounded-lg border border-card-border bg-card-bg">
      <aside className="border-r border-card-border">
        <div className="flex h-12 items-center justify-between border-b border-card-border px-3">
          <div className="text-sm font-medium">{transcripts.length} Pending</div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={refresh}
            disabled={busyId === "refresh"}
            title="Refresh"
          >
            <RefreshCw />
          </Button>
        </div>
        <div className="max-h-[588px] overflow-y-auto">
          {transcripts.map((transcript) => (
            <button
              key={transcript.id}
              onClick={() => setSelectedId(transcript.id)}
              className={`block w-full border-b border-card-border px-3 py-3 text-left transition-colors ${
                selected?.id === transcript.id ? "bg-white/5" : "hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{transcript.title || "Untitled call"}</div>
                  <div className="mt-1 text-xs text-muted">{formatDate(transcript.call_date)}</div>
                </div>
                <Badge variant={transcript.status === "needs_human_review" ? "destructive" : "secondary"}>
                  {statusLabels[transcript.status]}
                </Badge>
              </div>
              {transcript.participants.length > 0 && (
                <div className="mt-2 truncate text-xs text-muted">
                  {transcript.participants
                    .map((participant) => participant.firm_name || participant.display_name || participant.email)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ")}
                </div>
              )}
            </button>
          ))}
          {transcripts.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted">No transcripts waiting.</div>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        {error && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {selected ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-card-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{selected.title || "Untitled call"}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{formatDate(selected.call_date)}</span>
                    {selectedSourceUrl && (
                      <a
                        href={selectedSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:text-accent-hover"
                      >
                        <ExternalLink size={12} /> Source
                      </a>
                    )}
                    {selected.labels.map((label) => (
                      <span key={label} className="rounded bg-white/5 px-1.5 py-0.5 text-muted">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => review(selected.id, "approve")}
                    disabled={busyId === selected.id}
                  >
                    <Check /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => review(selected.id, "ignore")}
                    disabled={busyId === selected.id}
                  >
                    <X /> Ignore
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-[1fr_320px] overflow-hidden">
              <div className="overflow-y-auto px-5 py-4">
                {selected.processing_error && (
                  <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                    {selected.processing_error}
                  </div>
                )}

                <section className="mb-6">
                  <h3 className="text-sm font-medium">Summary</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {getSummary(selected.summary) || "No summary extracted."}
                  </p>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium">Observations</h3>
                    <span className="text-xs text-muted">{selected.observations.length}</span>
                  </div>
                  <div className="divide-y divide-card-border border-y border-card-border">
                    {selected.observations.map((observation) => (
                      <div key={observation.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-foreground">{observation.profile?.name ?? "Counterparty"}</span>
                          <span className="text-muted">{observation.topic}</span>
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-muted">
                            {observation.observation_type}
                          </span>
                          {observation.confidence !== null && (
                            <span className="text-muted">{Math.round(observation.confidence * 100)}%</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6">{observation.claim}</p>
                        {observation.evidence && (
                          <p className="mt-1 text-xs leading-5 text-muted">{observation.evidence}</p>
                        )}
                      </div>
                    ))}
                    {selected.observations.length === 0 && (
                      <div className="py-8 text-sm text-muted">No observations extracted.</div>
                    )}
                  </div>
                </section>
              </div>

              <aside className="overflow-y-auto border-l border-card-border px-4 py-4">
                <h3 className="text-sm font-medium">Participants</h3>
                <div className="mt-3 space-y-3">
                  {selected.participants.map((participant) => (
                    <div key={participant.id} className="text-sm">
                      <div className="font-medium">{participant.display_name || participant.email || "Unknown"}</div>
                      <div className="mt-0.5 text-xs text-muted">{participant.firm_name || participant.inferred_role || "No firm"}</div>
                      {participant.email && <div className="mt-0.5 truncate text-xs text-muted">{participant.email}</div>}
                    </div>
                  ))}
                  {selected.participants.length === 0 && (
                    <div className="text-sm text-muted">No participants captured.</div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Review queue is clear.
          </div>
        )}
      </section>
    </div>
  )
}
