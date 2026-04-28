'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readSystemDocuments } from '@/lib/byod-documents'

export default function Home() {
  const [activity, setActivity] = useState<any[]>([])

  useEffect(() => {
    function load() {
      const docs = readSystemDocuments()
      setActivity(docs.slice(0, 6))
    }
    load()
    window.addEventListener('amitis-byod-documents-updated', load)
    return () => window.removeEventListener('amitis-byod-documents-updated', load)
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Command Center</h1>
        <p className="text-sm text-muted">System activity and workstreams</p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Recent Activity</h2>
        <div className="rounded-xl border border-card-border bg-card-bg">
          {activity.length === 0 ? (
            <div className="p-4 text-sm text-muted">No activity yet</div>
          ) : (
            activity.map((doc) => (
              <div key={doc.id} className="p-3 border-b border-card-border text-sm flex justify-between">
                <div>
                  {doc.name}
                  <div className="text-xs text-muted">{doc.sourceModule}</div>
                </div>
                <div className="text-xs text-muted">{doc.signal}</div>
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
