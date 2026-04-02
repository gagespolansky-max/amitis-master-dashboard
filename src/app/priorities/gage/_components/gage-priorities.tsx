'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ScreenshotDropzone from './screenshot-dropzone'
import ManualAddForm from './manual-add-form'
import OcrCard, { type ScreenshotEntry, tryParseAnalysis } from './ocr-card'

function PeopleSummary({ entries }: { entries: ScreenshotEntry[] }) {
  const senderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) {
      const analysis = tryParseAnalysis(entry.extracted_text)
      if (analysis?.sender) {
        counts[analysis.sender] = (counts[analysis.sender] || 0) + 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [entries])

  if (senderCounts.length === 0) return null

  return (
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02] px-5 py-3.5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Owed to</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {senderCounts.map(([name, count]) => (
          <div
            key={name}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5"
          >
            <span className="text-sm text-foreground/90">{name}</span>
            <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GagePriorities() {
  const [entries, setEntries] = useState<ScreenshotEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/priorities/gage/api')
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleManualAdd = useCallback(async (entry: { summary: string; sender: string; source_app: string; action_items: string[] }) => {
    const res = await fetch('/priorities/gage/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    const { entry: newEntry } = await res.json()
    if (newEntry) {
      setEntries((prev) => [newEntry, ...prev])
    }
  }, [])

  const handleFileDrop = useCallback(async (file: File) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/priorities/gage/api', {
        method: 'POST',
        body: formData,
      })
      const { entry } = await res.json()
      if (entry) {
        setEntries((prev) => [entry, ...prev])
      }
    } catch (err) {
      console.error('Failed to process screenshot:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleUpdate = useCallback(async (id: string, updates: Partial<ScreenshotEntry>) => {
    const res = await fetch('/priorities/gage/api', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      )
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch('/priorities/gage/api', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    }
  }, [])

  return (
    <div className="space-y-6">
      <ScreenshotDropzone onFileDropped={handleFileDrop} isProcessing={isProcessing} />
      <ManualAddForm onAdd={handleManualAdd} />

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-muted py-8">
          No screenshots yet. Drop one above to get started.
        </p>
      ) : (
        <div className="space-y-4">
          <PeopleSummary entries={entries} />
          {entries.map((entry) => (
            <OcrCard
              key={entry.id}
              entry={entry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
