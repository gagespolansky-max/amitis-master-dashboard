'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { readSystemDocuments, markSystemDocumentReviewed, signalClass, type UploadedDocument } from '@/lib/byod-documents'

type Persona = 'CIO' | 'Investor Relations' | 'Operations' | 'Research Analyst'

const personas: Persona[] = ['CIO', 'Investor Relations', 'Operations', 'Research Analyst']

const personaCopy: Record<Persona, { tone: string; priority: string; action: string }> = {
  CIO: {
    tone: 'Executive view across portfolio risk, deal flow, and operating priorities.',
    priority: 'Portfolio and Deal documents get priority.',
    action: 'Decide what needs review before capital allocation or IC discussion.',
  },
  'Investor Relations': {
    tone: 'LP-facing view focused on freshness, collateral quality, and follow-up readiness.',
    priority: 'IR and Portfolio documents get priority.',
    action: 'Prepare materials before the next LP touchpoint.',
  },
  Operations: {
    tone: 'Execution view focused on bottlenecks, unresolved items, and handoffs.',
    priority: 'Needs Review and recently uploaded documents get priority.',
    action: 'Turn unresolved items into next actions.',
  },
  'Research Analyst': {
    tone: 'Analytical view focused on research materials, deal memos, and evidence gaps.',
    priority: 'Research and Deal documents get priority.',
    action: 'Identify what should be read first and what evidence is missing.',
  },
}

function personaWeightedDocs(persona: Persona, docs: UploadedDocument[]) {
  const preferred: Record<Persona, string[]> = {
    CIO: ['Portfolio', 'Deal'],
    'Investor Relations': ['IR', 'Portfolio'],
    Operations: ['Portfolio', 'Deal', 'IR', 'Research'],
    'Research Analyst': ['Research', 'Deal'],
  }

  return [...docs].sort((a, b) => {
    const aPreferred = preferred[persona].includes(a.category) ? 1 : 0
    const bPreferred = preferred[persona].includes(b.category) ? 1 : 0
    if (aPreferred !== bPreferred) return bPreferred - aPreferred
    if (a.signal !== b.signal) return a.signal === 'Needs Review' ? -1 : 1
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  })
}

function buildInsight(persona: Persona, docs: UploadedDocument[]) {
  if (docs.length === 0) {
    return `${persona}: No session documents have been uploaded yet. Upload a memo, deck, tear sheet, return file, or research note to create a session knowledge base and generate an operating view.`
  }

  const ranked = personaWeightedDocs(persona, docs)
  const needsReview = ranked.filter((doc) => doc.signal === 'Needs Review' || doc.signal === 'New')
  const counts = ranked.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1
    return acc
  }, {})
  const categorySummary = Object.entries(counts).map(([category, count]) => `${count} ${category}`).join(', ')
  const topDocs = ranked.slice(0, 2).map((doc) => doc.name).join(' and ')

  if (persona === 'CIO') {
    return `CIO view: Session knowledge includes ${categorySummary}. ${needsReview.length} item${needsReview.length === 1 ? '' : 's'} require attention. Prioritize ${topDocs || 'the newest uploaded materials'} before reviewing broader operating updates.`
  }

  if (persona === 'Investor Relations') {
    return `IR view: ${categorySummary} are available in this session. Review ${topDocs || 'the newest collateral'} for freshness before LP follow-up. Materials marked Needs Review should be cleared before outbound communication.`
  }

  if (persona === 'Operations') {
    return `Operations view: ${needsReview.length} open item${needsReview.length === 1 ? '' : 's'} need resolution. Use the uploaded session documents to drive the next handoff, then mark reviewed once each item has an owner or decision.`
  }

  return `Research Analyst view: Uploaded materials suggest ${topDocs || 'the newest research files'} are the highest-priority evidence. Start with items tagged Deal or Research, then identify missing diligence questions.`
}

export default function Home() {
  const [activity, setActivity] = useState<UploadedDocument[]>([])
  const [persona, setPersona] = useState<Persona>('CIO')
  const [insight, setInsight] = useState<string>('')

  useEffect(() => {
    function load() {
      setActivity(readSystemDocuments())
    }
    load()
    window.addEventListener('amitis-byod-documents-updated', load)
    return () => window.removeEventListener('amitis-byod-documents-updated', load)
  }, [])

  const needsAttention = useMemo(() => {
    return activity
      .filter((d) => d.signal === 'Needs Review' || d.signal === 'New')
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }, [activity])

  const prioritizedDocs = useMemo(() => personaWeightedDocs(persona, activity).slice(0, 4), [persona, activity])

  function generateInsight() {
    setInsight(buildInsight(persona, activity))
  }

  function markReviewed(id: string) {
    const next = markSystemDocumentReviewed(id)
    setActivity(next)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Command Center</h1>
        <p className="text-sm text-muted">Agentic operating model demo: choose a persona, use session documents, and generate a working view.</p>
      </div>

      <section className="rounded-xl border border-card-border bg-card-bg p-5 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-medium">Persona Insight</h2>
            <p className="mt-1 text-xs text-muted">Session knowledge only — based on uploaded documents and sample activity.</p>
          </div>
          <label className="text-sm text-muted">
            Persona
            <select
              value={persona}
              onChange={(event) => setPersona(event.target.value as Persona)}
              className="ml-2 rounded-md border border-card-border bg-background px-2 py-1.5 text-sm text-foreground outline-none"
            >
              {personas.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-card-border bg-background/30 p-4">
            <p className="text-sm font-medium">{persona}</p>
            <p className="mt-2 text-sm text-muted">{personaCopy[persona].tone}</p>
            <p className="mt-3 text-xs text-muted">{personaCopy[persona].priority}</p>
            <p className="mt-1 text-xs text-muted">{personaCopy[persona].action}</p>
          </div>

          <div className="rounded-lg border border-card-border bg-background/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Ask the Amitis Agent</p>
              <button onClick={generateInsight} className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90">
                Generate Insight
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">{insight || 'Upload documents, choose a persona, then generate an insight from the current session context.'}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Prioritized session documents</p>
          {prioritizedDocs.length === 0 ? (
            <p className="text-sm text-muted">No session documents yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {prioritizedDocs.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-card-border bg-background/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${signalClass(doc.signal)}`}>{doc.signal}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{doc.category} · {doc.type || 'Unknown'} · {new Date(doc.uploadedAt).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-1">Needs Attention</h2>
        <p className="text-xs text-muted mb-3">Items that require attention based on recent activity</p>
        <div className="rounded-xl border border-card-border bg-card-bg">
          {needsAttention.length === 0 ? (
            <div className="p-4 text-sm text-muted">Nothing needs attention</div>
          ) : (
            needsAttention.map((doc) => (
              <div key={doc.id} className="p-3 border-b border-card-border flex justify-between items-center">
                <div>
                  <div className="text-sm">{doc.name}</div>
                  <div className="text-xs text-muted">{doc.sourceModule} · {doc.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${signalClass(doc.signal)}`}>{doc.signal}</span>
                  <button onClick={() => markReviewed(doc.id)} className="text-xs text-muted hover:text-foreground">
                    Mark as Reviewed
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Recent Activity</h2>
        <div className="rounded-xl border border-card-border bg-card-bg">
          {activity.length === 0 ? (
            <div className="p-4 text-sm text-muted">Upload a document in Portfolio, ACIO, IR, or Research to start the session.</div>
          ) : (
            activity.slice(0, 6).map((doc) => (
              <div key={doc.id} className="p-3 border-b border-card-border flex justify-between">
                <div>
                  {doc.name}
                  <div className="text-xs text-muted">{doc.sourceModule} · {new Date(doc.uploadedAt).toLocaleString()}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${signalClass(doc.signal)}`}>{doc.signal}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Workstreams</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { t: 'ACIO', h: '/acio/deals' },
            { t: 'Portfolio', h: '/portfolio/fund-returns' },
            { t: 'Investor Relations', h: '/investor-relations' },
            { t: 'Research', h: '/research' },
          ].map((w) => (
            <Link key={w.t} href={w.h} className="p-4 border border-card-border rounded-lg bg-card-bg hover:border-accent/30">
              {w.t}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
