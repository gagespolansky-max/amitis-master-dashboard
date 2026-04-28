'use client'

import { useEffect, useMemo, useState } from 'react'

export type DocumentCategory = 'Portfolio' | 'Deal' | 'IR' | 'Research'

interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  category: DocumentCategory
  uploadedAt: string
}

interface DocumentUploadPanelProps {
  workstream: DocumentCategory
  title?: string
  description?: string
}

const categoryOptions: DocumentCategory[] = ['Portfolio', 'Deal', 'IR', 'Research']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function storageKey(workstream: DocumentCategory) {
  return `amitis-byod-documents-${workstream.toLowerCase()}`
}

export default function DocumentUploadPanel({
  workstream,
  title = 'Bring your own documents',
  description = 'Upload reference files for this workstream. Phase 1 keeps these local to your browser for demo purposes; no parsing or ingestion pipeline runs yet.',
}: DocumentUploadPanelProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const key = useMemo(() => storageKey(workstream), [workstream])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) setDocuments(JSON.parse(stored))
    } catch {
      setDocuments([])
    }
  }, [key])

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(documents))
  }, [documents, key])

  function handleUpload(files: FileList | null) {
    if (!files?.length) return

    const uploaded: UploadedDocument[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      type: file.type || file.name.split('.').pop()?.toUpperCase() || 'Unknown',
      size: file.size,
      category: workstream,
      uploadedAt: new Date().toISOString(),
    }))

    setDocuments((prev) => [...uploaded, ...prev])
  }

  function updateCategory(id: string, category: DocumentCategory) {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, category } : doc)))
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }

  return (
    <section className="rounded-xl border border-card-border bg-card-bg p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              BYOD light
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90">
          Upload files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              handleUpload(event.target.files)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-card-border bg-background/30">
        {documents.length === 0 ? (
          <div className="p-5 text-sm text-muted">
            No documents uploaded yet. Add a deck, memo, statement, model, or note to make this page feel connected to your real work.
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {documents.map((doc) => (
              <div key={doc.id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {doc.type || 'Unknown type'} · {formatBytes(doc.size)} · Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted">Suggested category</p>
                  <p className="mt-1 text-sm text-foreground">{workstream}</p>
                </div>

                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide text-muted">Assigned category</span>
                  <select
                    value={doc.category}
                    onChange={(event) => updateCategory(doc.id, event.target.value as DocumentCategory)}
                    className="mt-1 w-full rounded-md border border-card-border bg-background px-2 py-1.5 text-sm text-foreground outline-none"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => removeDocument(doc.id)}
                  className="text-left text-xs text-muted transition hover:text-foreground md:text-right"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
