'use client'

import { useState } from 'react'

interface RunStats {
  threads_examined: number
  threads_processed: number
  threads_skipped: number
  interactions_written: number
  interactions_updated: number
  action_items_created: number
  action_items_updated: number
}

interface RunResult {
  stats: RunStats
  duration_ms: number
  iterations: number
  stop_reason: 'end_turn' | 'max_iterations' | 'error'
  final_message: string
  error?: string
}

const PRESETS: { label: string; hours: number }[] = [
  { label: 'Last 1h', hours: 1 },
  { label: 'Last 6h', hours: 6 },
  { label: 'Last 24h', hours: 24 },
  { label: 'Last 72h', hours: 72 },
  { label: 'Last 7d', hours: 168 },
]

export default function TriagePanel() {
  const [hours, setHours] = useState(1)
  const [query, setQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/oig/triage/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours_back: hours,
          ...(query.trim() ? { query: query.trim() } : {}),
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`)
      }
      const data = (await res.json()) as RunResult
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold mb-1">Run Triage</h2>
        <p className="text-[12px] text-muted mb-4">
          Triage reads recent Gmail activity, classifies it, extracts action items, and writes
          everything to the OIG memory layer. Re-running over the same window is safe — dedup
          is enforced by source id.
        </p>
        <p className="text-[11px] text-muted bg-white/[0.02] border border-white/10 rounded-md px-3 py-2 mb-4">
          Up to 5 threads per run, typically finishes in ~30s. Re-run with a tighter window or
          filter for more thorough coverage. Progress logs as <code className="text-[10px]">[triage]</code>{' '}
          in the dev terminal.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.hours}
              onClick={() => setHours(p.hours)}
              disabled={running}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                hours === p.hours
                  ? 'bg-accent/20 text-accent border-accent/30'
                  : 'bg-transparent text-muted border-white/10 hover:text-foreground hover:border-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="text-[11px] text-muted ml-1">
            (or custom hours below)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wide text-muted mb-1">
              Hours back
            </span>
            <input
              type="number"
              min={1}
              max={336}
              value={hours}
              onChange={(e) => setHours(Math.max(1, Math.min(336, Number(e.target.value) || 1)))}
              disabled={running}
              className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] uppercase tracking-wide text-muted mb-1">
              Optional Gmail filter (e.g., <code className="text-[10px]">-from:noreply</code>)
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={running}
              placeholder="Leave blank for all recent threads"
              className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
            />
          </label>

          <button
            onClick={handleRun}
            disabled={running}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent/20 text-accent border border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Triaging…' : 'Run Triage'}
          </button>
        </div>

        {running && (
          <div className="mt-4 text-[12px] text-muted/80 font-mono">
            <span className="inline-block animate-pulse">⏺</span> Working — fetching threads,
            extracting, writing to OIG. Should finish in ~30 seconds.
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </section>

      {result && <ResultPanel result={result} />}
    </div>
  )
}

function ResultPanel({ result }: { result: RunResult }) {
  const { stats, duration_ms, iterations, stop_reason, final_message } = result
  const seconds = (duration_ms / 1000).toFixed(1)

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold">Run result</h2>
        <span className="text-[11px] text-muted">
          {seconds}s · {iterations} iteration{iterations === 1 ? '' : 's'} · {stop_reason}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric label="Threads examined" value={stats.threads_examined} />
        <Metric label="Processed" value={stats.threads_processed} accent />
        <Metric label="Skipped" value={stats.threads_skipped} />
        <Metric label="Interactions written" value={stats.interactions_written} accent />
        <Metric label="Interactions updated" value={stats.interactions_updated} />
        <Metric label="Action items created" value={stats.action_items_created} accent />
        <Metric label="Action items updated" value={stats.action_items_updated} />
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-[11px] uppercase tracking-wide text-muted mb-2">
          Agent summary
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{final_message}</p>
      </div>

      {result.error && (
        <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {result.error}
        </div>
      )}

      {stop_reason === 'max_iterations' && (
        <div className="mt-4 text-[12px] text-warning bg-warning/10 border border-warning/20 rounded-md px-3 py-2">
          Hit the iteration cap — some threads may not have been processed. Run again with a
          shorter window or a tighter Gmail filter.
        </div>
      )}
    </section>
  )
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${accent ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted mt-0.5">{label}</div>
    </div>
  )
}
