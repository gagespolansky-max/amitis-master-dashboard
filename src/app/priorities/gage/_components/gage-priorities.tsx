'use client'

import { useState, useEffect, useCallback } from 'react'
import ScreenshotDropzone from './screenshot-dropzone'
import OcrCard, { type ScreenshotEntry } from './ocr-card'
import { extractText } from '../_lib/ocr'

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

  const handleFileDrop = useCallback(async (file: File) => {
    setIsProcessing(true)
    try {
      // 1. Run OCR
      const text = await extractText(file)

      // 2. Upload image and save entry via API
      const formData = new FormData()
      formData.append('image', file)
      formData.append('extracted_text', text)

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
