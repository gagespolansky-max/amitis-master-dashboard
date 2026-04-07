'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ExternalLink } from 'lucide-react'
import type { OrgPerson, NotionPage } from '../_lib/types'

interface Props {
  person: OrgPerson
  onClose: () => void
}

export default function NotionModal({ person, onClose }: Props) {
  const [pages, setPages] = useState<NotionPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPages() {
      setLoading(true)
      const res = await fetch(`/operations/organization/api/notion?person_id=${person.id}`)
      if (res.ok) {
        const data = await res.json()
        setPages(data)
      }
      setLoading(false)
    }
    fetchPages()
  }, [person.id])

  const grouped = pages.reduce<Record<string, NotionPage[]>>((acc, page) => {
    const ts = page.teamspace || 'Uncategorized'
    if (!acc[ts]) acc[ts] = []
    acc[ts].push(page)
    return acc
  }, {})

  function recencyColor(lastEdited: string | null): string {
    if (!lastEdited) return 'text-muted'
    const days = Math.floor((Date.now() - new Date(lastEdited).getTime()) / (1000 * 60 * 60 * 24))
    if (days < 7) return 'text-green-400'
    if (days < 30) return 'text-yellow-400'
    if (days < 90) return 'text-muted'
    return 'text-red-400'
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0f1117] border-l border-card-border z-50 overflow-y-auto">
        <div className="sticky top-0 bg-[#0f1117] border-b border-card-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{person.name}</h3>
            <p className="text-xs text-muted mt-0.5">Notion Access</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : pages.length === 0 ? (
            <p className="text-muted text-sm text-center py-12">
              No Notion pages assigned. Run a sync from the Notion Audit tab first.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([teamspace, teamPages]) => (
                <div key={teamspace}>
                  <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                    {teamspace}
                  </h4>
                  <div className="space-y-1.5">
                    {teamPages.map((page) => (
                      <a
                        key={page.id}
                        href={`https://notion.so/${page.notion_page_id.replace(/-/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate">{page.page_title}</span>
                            <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
                              {page.page_type}
                            </span>
                          </div>
                          {page.last_edited && (
                            <p className={`text-[11px] mt-0.5 ${recencyColor(page.last_edited)}`}>
                              Last edited {new Date(page.last_edited).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
