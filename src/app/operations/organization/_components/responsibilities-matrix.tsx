'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, AlertTriangle, MinusCircle } from 'lucide-react'
import type { OrgPerson, OrgResponsibility, ResponsibilityAssignment } from '../_lib/types'

const ROLE_DISPLAY: Record<string, { label: string; style: string }> = {
  owner: { label: 'O', style: 'bg-accent text-white' },
  contributor: { label: 'C', style: 'bg-accent/40 text-accent' },
  backup: { label: 'B', style: 'bg-white/10 text-muted border border-accent/30' },
}

const ROLE_CYCLE = ['', 'owner', 'contributor', 'backup'] as const

const CATEGORIES = ['Investment', 'Operations', 'Marketing', 'Research', 'Tech']

export default function ResponsibilitiesMatrix() {
  const [people, setPeople] = useState<OrgPerson[]>([])
  const [responsibilities, setResponsibilities] = useState<OrgResponsibility[]>([])
  const [assignments, setAssignments] = useState<ResponsibilityAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [newArea, setNewArea] = useState('')
  const [newCategory, setNewCategory] = useState('Operations')
  const [showAdd, setShowAdd] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [peopleRes, respRes] = await Promise.all([
      fetch('/operations/organization/api'),
      fetch('/operations/organization/api/responsibilities'),
    ])

    if (peopleRes.ok) {
      const data = await peopleRes.json()
      setPeople(data.filter((p: OrgPerson) => p.team !== 'external'))
    }
    if (respRes.ok) {
      const data = await respRes.json()
      setResponsibilities(data.responsibilities || [])
      setAssignments(data.assignments || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const getAssignment = (personId: string, respId: string) => {
    return assignments.find((a) => a.person_id === personId && a.responsibility_id === respId)
  }

  const handleCellClick = async (personId: string, respId: string) => {
    const current = getAssignment(personId, respId)
    const currentRole = current?.role || ''
    const currentIdx = ROLE_CYCLE.indexOf(currentRole as typeof ROLE_CYCLE[number])
    const nextRole = ROLE_CYCLE[(currentIdx + 1) % ROLE_CYCLE.length]

    const res = await fetch('/operations/organization/api/responsibilities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_id: personId, responsibility_id: respId, role: nextRole || null }),
    })

    if (res.ok) {
      if (nextRole) {
        const updated = await res.json()
        setAssignments((prev) => {
          const without = prev.filter(
            (a) => !(a.person_id === personId && a.responsibility_id === respId)
          )
          return [...without, updated]
        })
      } else {
        setAssignments((prev) =>
          prev.filter((a) => !(a.person_id === personId && a.responsibility_id === respId))
        )
      }
    }
  }

  const handleAddArea = async () => {
    if (!newArea.trim()) return
    const res = await fetch('/operations/organization/api/responsibilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: newArea.trim(), category: newCategory }),
    })
    if (res.ok) {
      const data = await res.json()
      setResponsibilities((prev) => [...prev, data])
      setNewArea('')
      setShowAdd(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    )
  }

  const filtered = filterCategory
    ? responsibilities.filter((r) => r.category === filterCategory)
    : responsibilities

  const getOwnerCount = (respId: string) => {
    return assignments.filter((a) => a.responsibility_id === respId && a.role === 'owner').length
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-card-bg border border-card-border rounded-lg px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-accent text-white text-[10px]">O</span> Owner</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-accent/40 text-accent text-[10px]">C</span> Contributor</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-white/10 text-muted text-[10px] border border-accent/30">B</span> Backup</span>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Area
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-card-bg border border-card-border rounded-lg">
          <input
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            placeholder="Responsibility area name..."
            className="flex-1 bg-transparent border border-card-border rounded px-3 py-1.5 text-sm text-foreground placeholder:text-muted"
            onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-card-bg border border-card-border rounded px-3 py-1.5 text-sm text-foreground"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={handleAddArea}
            className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent/80"
          >
            Add
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left py-2 px-3 text-xs font-medium text-muted uppercase tracking-wider sticky left-0 bg-[#0f1117] min-w-[200px]">
                Area
              </th>
              {people.map((p) => (
                <th key={p.id} className="py-2 px-1 text-center min-w-[80px]">
                  <div className="text-[11px] font-medium text-foreground truncate">
                    {p.name.split(' ')[0]}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${p.team === 'samara' ? 'text-amber-400' : 'text-muted'}`}>
                    {p.team === 'samara' ? 'SAM' : ''}
                  </div>
                </th>
              ))}
              <th className="py-2 px-2 text-center text-xs font-medium text-muted min-w-[60px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((resp) => {
              const ownerCount = getOwnerCount(resp.id)
              const hasOverlap = ownerCount > 1
              const hasGap = ownerCount === 0

              return (
                <tr
                  key={resp.id}
                  className={`border-b border-card-border/50 ${
                    hasOverlap ? 'bg-amber-500/5' : hasGap ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="py-2 px-3 sticky left-0 bg-[#0f1117]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{resp.area}</span>
                      {resp.category && (
                        <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
                          {resp.category}
                        </span>
                      )}
                    </div>
                  </td>
                  {people.map((p) => {
                    const assignment = getAssignment(p.id, resp.id)
                    const roleInfo = assignment ? ROLE_DISPLAY[assignment.role] : null

                    return (
                      <td key={p.id} className="py-2 px-1 text-center">
                        <button
                          onClick={() => handleCellClick(p.id, resp.id)}
                          className="w-7 h-7 rounded flex items-center justify-center mx-auto transition-all hover:ring-1 hover:ring-accent/50"
                          title={`Click to cycle: empty → owner → contributor → backup`}
                        >
                          {roleInfo ? (
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${roleInfo.style}`}>
                              {roleInfo.label}
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded flex items-center justify-center text-muted/30 hover:text-muted/60">
                              &middot;
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                  <td className="py-2 px-2 text-center">
                    {hasOverlap && (
                      <span className="flex items-center justify-center gap-1 text-amber-400" title="Multiple owners — overlap">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {hasGap && (
                      <span className="flex items-center justify-center gap-1 text-red-400" title="No owner — gap">
                        <MinusCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-muted text-center py-8">No responsibility areas found.</p>
      )}
    </div>
  )
}
