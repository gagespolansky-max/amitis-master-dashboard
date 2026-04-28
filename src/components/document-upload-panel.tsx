'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  readSystemDocuments,
  writeSystemDocuments,
  formatBytes,
  type UploadedDocument,
  type DocumentCategory,
} from '@/lib/byod-documents'

function storageKey(workstream: DocumentCategory) {
  return `amitis-byod-documents-${workstream.toLowerCase()}`
}

export default function DocumentUploadPanel({ workstream }: { workstream: DocumentCategory }) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const key = useMemo(() => storageKey(workstream), [workstream])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) setDocuments(JSON.parse(stored))
    } catch {}
  }, [key])

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(documents))
  }, [documents, key])

  function handleUpload(files: FileList | null) {
    if (!files?.length) return

    const now = new Date().toISOString()
    const uploaded: UploadedDocument[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || 'Unknown',
      size: file.size,
      category: workstream,
      sourceModule: workstream,
      signal: 'New',
      uploadedAt: now,
    }))

    setDocuments((prev) => [...uploaded, ...prev])

    const existing = readSystemDocuments()
    writeSystemDocuments([...uploaded, ...existing])

    setFeedback(`Added to ${workstream} • Available across system • Tagged as ${workstream}`)
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <section className="rounded-xl border border-card-border bg-card-bg p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Documents</h2>
        <label className="bg-accent px-3 py-1.5 rounded text-sm text-white cursor-pointer">
          Upload
          <input type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
        </label>
      </div>

      {feedback && <div className="text-xs text-accent">{feedback}</div>}

      {documents.map((doc) => (
        <div key={doc.id} className="flex justify-between text-sm border-t border-card-border pt-2">
          <div>
            {doc.name}
            <div className="text-xs text-muted">{formatBytes(doc.size)}</div>
          </div>
          <div className="text-xs text-muted">{doc.signal}</div>
        </div>
      ))}
    </section>
  )
}
