"use client"

import { useState, useEffect, useMemo } from "react"
import DirectoryEntryCard from "./directory-entry-card"
import type { DirectoryEntry } from "./directory-entry-card"
import DetailPanel from "./detail-panel"

interface SystemDirectoryViewProps {
  initialSelection?: string | null
}

export default function SystemDirectoryView({ initialSelection }: SystemDirectoryViewProps) {
  const [entries, setEntries] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [scopeFilter, setScopeFilter] = useState("all")

  useEffect(() => {
    fetch("/skills/admin/system-directory/api")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (initialSelection) {
      setSelectedName(initialSelection)
    }
  }, [initialSelection])

  const scopes = useMemo(() => {
    const unique = new Set(entries.map((e) => e.scope))
    return Array.from(unique).sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesScope =
        scopeFilter === "all" || entry.scope === scopeFilter
      const matchesSearch =
        !search ||
        entry.name.toLowerCase().includes(search.toLowerCase()) ||
        entry.description.toLowerCase().includes(search.toLowerCase())
      return matchesScope && matchesSearch
    })
  }, [entries, search, scopeFilter])

  const agents = filtered.filter((e) => e.layer === "agent")
  const skills = filtered.filter((e) => e.layer === "skill")

  const selectedEntry = entries.find((e) => e.name === selectedName) || null

  const referencedNames = useMemo(() => {
    if (!selectedEntry) return new Set<string>()
    return new Set(selectedEntry.uses)
  }, [selectedEntry])

  function handleSelect(name: string) {
    setSelectedName((prev) => (prev === name ? null : name))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Scanning filesystem...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="border border-card-border rounded-xl overflow-hidden bg-card-bg">
      <div className="px-5 py-3 border-b border-card-border flex items-center gap-3">
        <input
          type="text"
          placeholder="Search agents and skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => setScopeFilter("all")}
            className={`text-xs px-2.5 py-1.5 rounded transition-colors ${
              scopeFilter === "all"
                ? "bg-accent/20 border border-accent/40 text-accent-hover"
                : "bg-background border border-card-border text-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {scopes.map((scope) => (
            <button
              key={scope}
              onClick={() => setScopeFilter(scope)}
              className={`text-xs px-2.5 py-1.5 rounded transition-colors ${
                scopeFilter === scope
                  ? "bg-accent/20 border border-accent/40 text-accent-hover"
                  : "bg-background border border-card-border text-muted hover:text-foreground"
              }`}
            >
              {scope === "global" ? "Global" : scope.replace("project:", "")}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted whitespace-nowrap">
          {filtered.length} total
        </span>
      </div>

      <div className="flex" style={{ height: "calc(100vh - 220px)" }}>
        <div className="w-[30%] border-r border-card-border p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Agents
            </span>
            <span className="text-[11px] text-muted">{agents.length}</span>
          </div>
          <div className="space-y-2">
            {agents.map((entry) => (
              <DirectoryEntryCard
                key={entry.name}
                entry={entry}
                isSelected={selectedName === entry.name}
                isReferenced={referencedNames.has(entry.name)}
                onClick={() => handleSelect(entry.name)}
              />
            ))}
            {agents.length === 0 && (
              <div className="text-xs text-muted text-center py-4">
                No agents match filters
              </div>
            )}
          </div>
        </div>

        <div className="w-[40%] border-r border-card-border p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Skills
            </span>
            <span className="text-[11px] text-muted">{skills.length}</span>
          </div>
          <div className="space-y-2">
            {skills.map((entry) => (
              <DirectoryEntryCard
                key={entry.name}
                entry={entry}
                isSelected={selectedName === entry.name}
                isReferenced={referencedNames.has(entry.name)}
                onClick={() => handleSelect(entry.name)}
              />
            ))}
            {skills.length === 0 && (
              <div className="text-xs text-muted text-center py-4">
                No skills match filters
              </div>
            )}
          </div>
        </div>

        <div className="w-[30%] overflow-y-auto">
          <DetailPanel
            entry={selectedEntry}
            allEntries={entries}
            onSelectEntry={handleSelect}
          />
        </div>
      </div>
    </div>
  )
}
