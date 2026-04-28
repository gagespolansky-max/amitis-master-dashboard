export type DocumentCategory = 'Portfolio' | 'Deal' | 'IR' | 'Research'
export type DocumentSignal = 'New' | 'Needs Review' | 'Recently Updated'

export interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  category: DocumentCategory
  sourceModule: DocumentCategory
  signal: DocumentSignal
  uploadedAt: string
}

export const byodSystemKey = 'amitis-byod-system-documents'
export const categoryOptions: DocumentCategory[] = ['Portfolio', 'Deal', 'IR', 'Research']

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function readSystemDocuments(): UploadedDocument[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(byodSystemKey)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function writeSystemDocuments(documents: UploadedDocument[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(byodSystemKey, JSON.stringify(documents))
  window.dispatchEvent(new CustomEvent('amitis-byod-documents-updated'))
}
