export type DocumentCategory = 'Portfolio' | 'Deal' | 'IR' | 'Research'
export type DocumentSignal = 'New' | 'Needs Review' | 'Reviewed'

export interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  category: DocumentCategory
  sourceModule: DocumentCategory
  signal: DocumentSignal
  uploadedAt: string
  reviewedAt?: string
}

export const byodSystemKey = 'amitis-byod-system-documents'
export const categoryOptions: DocumentCategory[] = ['Portfolio', 'Deal', 'IR', 'Research']
export const reviewThresholdMs = 12_000

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function normalizeSignals(documents: UploadedDocument[]) {
  const now = Date.now()
  let changed = false
  const normalized = documents.map((doc) => {
    if (doc.signal === 'Reviewed') return doc
    const age = now - new Date(doc.uploadedAt).getTime()
    if (age >= reviewThresholdMs && doc.signal !== 'Needs Review') {
      changed = true
      return { ...doc, signal: 'Needs Review' as DocumentSignal }
    }
    return doc
  })
  return { documents: normalized, changed }
}

export function readSystemDocuments(): UploadedDocument[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(byodSystemKey)
    const parsed = stored ? JSON.parse(stored) : []
    const { documents, changed } = normalizeSignals(parsed)
    if (changed) writeSystemDocuments(documents)
    return documents
  } catch {
    return []
  }
}

export function writeSystemDocuments(documents: UploadedDocument[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(byodSystemKey, JSON.stringify(documents))
  window.dispatchEvent(new CustomEvent('amitis-byod-documents-updated'))
}

export function markSystemDocumentReviewed(id: string) {
  const documents = readSystemDocuments().map((doc) =>
    doc.id === id ? { ...doc, signal: 'Reviewed' as DocumentSignal, reviewedAt: new Date().toISOString() } : doc
  )
  writeSystemDocuments(documents)
  return documents
}

export function signalClass(signal: DocumentSignal) {
  if (signal === 'Needs Review') return 'bg-warning/15 text-warning border border-warning/30'
  if (signal === 'Reviewed') return 'bg-muted/10 text-muted border border-card-border'
  return 'bg-accent/10 text-accent border border-accent/20'
}
