'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ExternalLink } from 'lucide-react'
import type { OrgPerson, NotionPage } from '../_lib/types'
import TechStackPills from './tech-stack-pills'

interface Props {
  person: OrgPerson
  onClose: () => void
}

export default function PersonDetailPanel({ person, onClose }: Props) {
  const [pages, setPages] = useState<NotionPage[]>([])
  const [loadingPages, setLoadingPages] = useState(true)

  useEffect(() => {
    async function fetchPages() {
      setLoadingPages(true)
      const res = await fetch(`/operations/organization/api/notion?person_id=${person.id}`)
      if (res.ok) {
        const data = await res.json()
        setPages(data)
      }
      setLoadingPages(false)
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

  const responsibilities = person.responsibilities
    ? person.responsibilities.split(',').map((r) => r.trim()).filter(Boolean)
    : []

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-card-bg border-b border-card-border px-5 py-4 flex items-center justify-between z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{person.name}</h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              person.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
              person.status === 'incoming' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }`}>
              {person.status}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">{person.title}</p>
          {person.location && (
            <p className="text-[10px] text-muted/60 mt-0.5">{person.location}</p>
          )}
        </div>
        <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Background */}
        {person.job_description && (
          <div>
            <h4 className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5">Background</h4>
            <p className="text-xs text-foreground/80 leading-relaxed">{person.job_description}</p>
          </div>
        )}

        {/* Responsibilities */}
        {responsibilities.length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5">Responsibilities</h4>
            <ul className="space-y-1">
              {responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <span className="text-muted mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Platforms */}
        {person.tech_stack && person.tech_stack.length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5">Platforms</h4>
            <TechStackPills items={person.tech_stack} />
          </div>
        )}

        {/* Notion Pages */}
        <div>
          <h4 className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5">Notion Pages</h4>
          {loadingPages ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-3 h-3 animate-spin text-muted" />
              <span className="text-xs text-muted">Loading...</span>
            </div>
          ) : pages.length === 0 ? (
            <p className="text-xs text-muted/60 py-2">No Notion pages assigned.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([teamspace, teamPages]) => (
                <div key={teamspace}>
                  <p className="text-[9px] text-muted/60 uppercase tracking-wider mb-1">{teamspace}</p>
                  <div className="space-y-1">
                    {teamPages.map((page) => (
                      <a
                        key={page.id}
                        href={`https://notion.so/${page.notion_page_id.replace(/-/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-white/5 transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] truncate">{page.page_title}</span>
                            <span className="text-[8px] text-muted bg-white/5 px-1 py-0.5 rounded">{page.page_type}</span>
                          </div>
                          {page.last_edited && (
                            <p className={`text-[9px] mt-0.5 ${recencyColor(page.last_edited)}`}>
                              {new Date(page.last_edited).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
