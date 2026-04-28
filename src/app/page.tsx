'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readSystemDocuments, markSystemDocumentReviewed, signalClass } from '@/lib/byod-documents'

export default function Home() {
  const [activity, setActivity] = useState<any[]>([])

  useEffect(() => {
    function load() {
      const docs = readSystemDocuments()
      setActivity(docs)
    }
    load()
    window.addEventListener('amitis-byod-documents-updated', load)
    return () => window.removeEventListener('amitis-byod-documents-updated', load)
  }, [])

  const needsAttention = activity
    .filter((d) => d.signal === 'Needs Review' || d.signal === 'New')
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Command Center</h1>
        <p className="text-sm text-muted">System activity and priorities</p>
      </div>

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
                  <div className="text-xs text-muted">{doc.sourceModule}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${signalClass(doc.signal)}`}>{doc.signal}</span>
                  {doc.signal !== 'Reviewed' && (
                    <button onClick={() => markSystemDocumentReviewed(doc.id)} className="text-xs text-muted hover:text-foreground">
                      Mark as Reviewed
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Recent Activity</h2>
        <div className="rounded-xl border border-card-border bg-card-bg">
          {activity.slice(0, 6).map((doc) => (
            <div key={doc.id} className="p-3 border-b border-card-border flex justify-between">
              <div>
                {doc.name}
                <div className="text-xs text-muted">{doc.sourceModule}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${signalClass(doc.signal)}`}>{doc.signal}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Workstreams</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { t: 'ACIO', h: '/acio/deals' },
            { t: 'Portfolio', h: '/portfolio/fund-returns' },
            { t: 'IR', h: '/investor-relations' },
            { t: 'Research', h: '/research' },
          ].map((w) => (
            <Link key={w.t} href={w.h} className="p-4 border rounded-lg">
              {w.t}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
