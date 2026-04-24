'use client'

import { useState } from 'react'
import type { FundReturn } from '../_lib/types'

function VerifyButton({ row, onToggle }: { row: FundReturn; onToggle: (id: string, v: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(row.id, !row.verified)}
      className={`w-6 h-6 rounded border flex items-center justify-center text-sm transition-colors ${
        row.verified
          ? 'bg-green-600 border-green-500 text-white'
          : 'border-zinc-600 text-zinc-500 hover:border-zinc-400'
      }`}
      title={row.verified ? `Verified ${row.verified_at ? new Date(row.verified_at).toLocaleDateString() : ''}` : 'Click to verify'}
    >
      {row.verified ? '✓' : ''}
    </button>
  )
}

export default function ReturnsTable({ initialData }: { initialData: FundReturn[] }) {
  const [data, setData] = useState(initialData)
  const [filter, setFilter] = useState<'all' | 'unverified' | 'verified'>('all')
  const [running, setRunning] = useState(false)
  const [runOutput, setRunOutput] = useState<string | null>(null)

  const isVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV)

  const months = [...new Set(data.map(r => r.return_month))].sort((a, b) => {
    const da = new Date(a + ' 1')
    const db = new Date(b + ' 1')
    return db.getTime() - da.getTime()
  })
  const [selectedMonth, setSelectedMonth] = useState(months[0] || '')

  const filtered = data.filter(r => {
    if (selectedMonth && r.return_month !== selectedMonth) return false
    if (filter === 'verified' && !r.verified) return false
    if (filter === 'unverified' && r.verified) return false
    return true
  })

  async function handleRunNow() {
    setRunning(true)
    setRunOutput(null)
    try {
      const resp = await fetch('/portfolio/fund-returns/api/run', { method: 'POST' })
      const result = await resp.json()
      setRunOutput(result.output || result.error || 'Done')
      // Refresh data from Supabase
      const dataResp = await fetch('/portfolio/fund-returns/api/data')
      if (dataResp.ok) {
        const fresh = await dataResp.json()
        setData(fresh)
      } else {
        window.location.reload()
      }
      // Auto-dismiss the log after 10 seconds
      setTimeout(() => setRunOutput(null), 10000)
    } catch {
      setRunOutput('Failed to run extraction')
    } finally {
      setRunning(false)
    }
  }

  async function handleToggleVerify(id: string, verified: boolean) {
    const resp = await fetch('/portfolio/fund-returns/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, verified }),
    })
    if (resp.ok) {
      setData(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, verified, verified_at: verified ? new Date().toISOString() : null }
            : r
        )
      )
    }
  }

  return (
    <div>
      {/* Filters + Run Now */}
      <div className="flex gap-4 mb-6 items-center">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
        >
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['all', 'unverified', 'verified'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-sm capitalize ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {!isVercel && (
          <div className="ml-auto">
            <button
              onClick={handleRunNow}
              disabled={running}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                running
                  ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {running ? 'Running...' : 'Run Now'}
            </button>
          </div>
        )}
      </div>

      {/* Run output */}
      {runOutput && (
        <div className="mb-4 relative">
          <button
            onClick={() => setRunOutput(null)}
            className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300 text-xs"
          >
            Dismiss
          </button>
          <pre className="p-3 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-400 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {runOutput}
          </pre>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="pb-3 pr-4">Fund</th>
              <th className="pb-3 pr-4">Share Class</th>
              <th className="pb-3 pr-4">Return</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Gross/Net</th>
              <th className="pb-3 pr-4">As Of</th>
              <th className="pb-3 pr-4">Audit</th>
              <th className="pb-3 pr-4">Verified</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                <td className="py-3 pr-4 font-medium">{row.fund_name}</td>
                <td className="py-3 pr-4 text-zinc-400">{row.share_class}</td>
                <td className="py-3 pr-4">
                  <span className={row.return_value >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {row.return_value >= 0 ? '+' : ''}{row.return_value.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 pr-4 text-zinc-400">{row.return_type}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    row.gross_net === 'Gross'
                      ? 'bg-amber-900/50 text-amber-300'
                      : 'bg-emerald-900/50 text-emerald-300'
                  }`}>
                    {row.gross_net}
                  </span>
                </td>
                <td className="py-3 pr-4 text-zinc-400">{row.as_of_date}</td>
                <td className="py-3 pr-4">
                  {row.audit_url ? (
                    <a
                      href={row.audit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <VerifyButton row={row} onToggle={handleToggleVerify} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No returns found for {selectedMonth || 'selected filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
