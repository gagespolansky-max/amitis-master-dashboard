'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, Users, FileText, AlertTriangle } from 'lucide-react'
import type { OrgPerson, NotionPage } from '../_lib/types'

interface AuditPage extends NotionPage {
  owners: { person_id: string; person_name: string; access_level: string }[]
}

type ViewMode = 'by-page' | 'by-person'

export default function NotionAuditTab() {
  const [pages, setPages] = useState<AuditPage[]>([])
  const [people, setPeople] = useState<OrgPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('by-page')
  const [filterTeamspace, setFilterTeamspace] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPerson, setFilterPerson] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [auditRes, peopleRes] = await Promise.all([
        fetch('/operations/organization/api/notion/audit'),
        fetch('/operations/organization/api'),
      ])

      if (auditRes.ok) {
        const data = await auditRes.json()
        if (Array.isArray(data)) setPages(data)
      } else {
        setError('Failed to load audit data')
      }

      if (peopleRes.ok) {
        const data = await peopleRes.json()
        if (Array.isArray(data)) setPeople(data.filter((p: OrgPerson) => p.team !== 'external'))
      }
    } catch {
      setError('Failed to connect to API')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSync = async () => {
    setSyncing(true)
    const res = await fetch('/operations/organization/api/notion/sync', { method: 'POST' })
    if (res.ok) await fetchData()
    setSyncing(false)
  }

  const handleAssignOwner = async (notionPageId: string, personId: string) => {
    await fetch('/operations/organization/api/notion/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notion_page_id: notionPageId, person_id: personId, access_level: 'owner' }),
    })
    await fetchData()
  }

  const handleConsolidationStatus = async (notionPageId: string, status: string) => {
    await fetch('/operations/organization/api/notion/audit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notion_page_id: notionPageId, consolidation_status: status }),
    })
    setPages((prev) =>
      prev.map((p) =>
        p.notion_page_id === notionPageId ? { ...p, consolidation_status: status as AuditPage['consolidation_status'] } : p
      )
    )
  }

  const teamspaces = [...new Set(pages.map((p) => p.teamspace).filter(Boolean))] as string[]

  const filteredPages = pages.filter((p) => {
    if (filterTeamspace && p.teamspace !== filterTeamspace) return false
    if (filterStatus && p.consolidation_status !== filterStatus) return false
    if (filterPerson && !p.owners.some((o) => o.person_id === filterPerson)) return false
    return true
  })

  const staleDays = (lastEdited: string | null) => {
    if (!lastEdited) return Infinity
    return Math.floor((Date.now() - new Date(lastEdited).getTime()) / (1000 * 60 * 60 * 24))
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      unreviewed: 'bg-white/10 text-muted',
      keep: 'bg-green-500/20 text-green-400',
      consolidate: 'bg-amber-500/20 text-amber-400',
      archive: 'bg-red-500/20 text-red-400',
    }
    return styles[status] || styles.unreviewed
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    )
  }

  const pagesByPerson: Record<string, AuditPage[]> = {}
  for (const person of people) {
    pagesByPerson[person.id] = filteredPages.filter((p) =>
      p.owners.some((o) => o.person_id === person.id)
    )
  }
  const unassigned = filteredPages.filter((p) => p.owners.length === 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-card-bg border border-card-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('by-page')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'by-page' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              <FileText className="w-3 h-3 inline mr-1" />
              By Page
            </button>
            <button
              onClick={() => setViewMode('by-person')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'by-person' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              By Person
            </button>
          </div>

          <select
            value={filterTeamspace}
            onChange={(e) => setFilterTeamspace(e.target.value)}
            className="bg-card-bg border border-card-border rounded-lg px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All Teamspaces</option>
            {teamspaces.map((ts) => (
              <option key={ts} value={ts}>{ts}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-card-bg border border-card-border rounded-lg px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All Statuses</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="keep">Keep</option>
            <option value="consolidate">Consolidate</option>
            <option value="archive">Archive</option>
          </select>

          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className="bg-card-bg border border-card-border rounded-lg px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All People</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">{error}</p>
          <button onClick={fetchData} className="text-xs text-accent hover:underline">Retry</button>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted mb-2">No Notion pages synced yet.</p>
          <p className="text-xs text-muted">Click "Sync Now" to pull your Notion workspace data. Requires NOTION_ORG_API_KEY in .env.local.</p>
        </div>
      ) : viewMode === 'by-page' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">Page</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">Type</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">Teamspace</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">Owner</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">Last Edited</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => {
                const days = staleDays(page.last_edited)
                return (
                  <tr key={page.id} className="border-b border-card-border/50 hover:bg-white/5">
                    <td className="py-2 px-3">
                      <a
                        href={`https://notion.so/${page.notion_page_id.replace(/-/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:text-accent transition-colors"
                      >
                        {page.page_title}
                      </a>
                      {page.parent_path && (
                        <p className="text-[10px] text-muted truncate max-w-xs">{page.parent_path}</p>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-muted">{page.page_type}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted">{page.teamspace || '—'}</td>
                    <td className="py-2 px-3">
                      {page.owners.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {page.owners.map((o) => (
                            <span key={o.person_id} className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                              {o.person_name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignOwner(page.notion_page_id, e.target.value)
                          }}
                          className="bg-transparent border border-card-border rounded px-2 py-1 text-xs text-muted"
                        >
                          <option value="">Assign...</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {page.last_edited ? (
                        <span className={`text-xs ${days > 90 ? 'text-red-400' : days > 30 ? 'text-muted' : days > 7 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {days === 0 ? 'Today' : `${days}d ago`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={page.consolidation_status}
                        onChange={(e) => handleConsolidationStatus(page.notion_page_id, e.target.value)}
                        className={`text-[10px] rounded px-2 py-1 border-0 ${statusBadge(page.consolidation_status)}`}
                      >
                        <option value="unreviewed">Unreviewed</option>
                        <option value="keep">Keep</option>
                        <option value="consolidate">Consolidate</option>
                        <option value="archive">Archive</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {people.map((person) => {
            const personPages = pagesByPerson[person.id] || []
            if (personPages.length === 0) return null

            return (
              <div key={person.id} className="bg-card-bg border border-card-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium">{person.name}</h3>
                  <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
                    {personPages.length} pages
                  </span>
                </div>
                <div className="space-y-1">
                  {personPages.map((page) => (
                    <div key={page.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] bg-white/5 px-1 py-0.5 rounded text-muted">{page.page_type}</span>
                        <a
                          href={`https://notion.so/${page.notion_page_id.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm truncate hover:text-accent transition-colors"
                        >
                          {page.page_title}
                        </a>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge(page.consolidation_status)}`}>
                        {page.consolidation_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {unassigned.length > 0 && (
            <div className="bg-card-bg border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-medium text-red-400">Unassigned Pages</h3>
                <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
                  {unassigned.length} pages
                </span>
              </div>
              <div className="space-y-1">
                {unassigned.map((page) => (
                  <div key={page.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5">
                    <span className="text-sm truncate">{page.page_title}</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleAssignOwner(page.notion_page_id, e.target.value)
                      }}
                      className="bg-transparent border border-card-border rounded px-2 py-1 text-xs text-muted"
                    >
                      <option value="">Assign...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
