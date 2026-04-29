'use client'

import { useState } from 'react'

export default function DraftForm() {
  const [source, setSource] = useState('')
  const [angle, setAngle] = useState('')
  const [drafts, setDrafts] = useState('')
  const [meta, setMeta] = useState<{
    model: string
    duration_ms: number
    fetched: boolean
    fetched_url?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!source.trim() || !angle.trim()) return
    setLoading(true)
    setError('')
    setDrafts('')
    setMeta(null)
    try {
      const r = await fetch('/investor-relations/x-posts/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, angle }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      setDrafts(data.drafts)
      setMeta({
        model: data.model,
        duration_ms: data.duration_ms,
        fetched: !!data.fetched,
        fetched_url: data.fetched_url,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Source — tweet URL, pasted tweet text, article excerpt, or topic
        </label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={5}
          className="w-full bg-[#1a1d27] border border-[#2a2d37] rounded p-3 text-sm font-mono focus:outline-none focus:border-indigo-500"
          placeholder="Paste the tweet, article excerpt, or topic Chris is reacting to…"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Angle — one sentence on what Chris wants to convey
        </label>
        <textarea
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          rows={2}
          className="w-full bg-[#1a1d27] border border-[#2a2d37] rounded p-3 text-sm font-mono focus:outline-none focus:border-indigo-500"
          placeholder="e.g., institutional adoption is structurally accelerating because state pension funds can now allocate"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading || !source.trim() || !angle.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium transition"
        >
          {loading ? 'Drafting…' : 'Generate 2-3 drafts'}
        </button>
        {meta && !loading && (
          <span className="text-xs text-gray-500">
            {meta.model} · {(meta.duration_ms / 1000).toFixed(1)}s
            {meta.fetched ? ' · URL fetched' : ''}
          </span>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded p-3">
          {error}
        </div>
      )}

      {drafts && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-300">Drafts</h2>
            <button
              onClick={() => navigator.clipboard.writeText(drafts)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Copy all
            </button>
          </div>
          <pre className="bg-[#1a1d27] border border-[#2a2d37] rounded p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {drafts}
          </pre>
        </div>
      )}
    </div>
  )
}
