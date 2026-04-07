'use client'

import type { OrgPerson } from '../_lib/types'
import { Building2 } from 'lucide-react'

interface Props {
  providers: OrgPerson[]
}

export default function ExternalProviders({ providers }: Props) {
  if (providers.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-card-border" />
        <span className="text-xs text-muted uppercase tracking-wider">External Service Providers</span>
        <div className="h-px flex-1 bg-card-border" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {providers.map((p) => (
          <div key={p.id} className="bg-card-bg border border-card-border rounded-lg p-3 text-center">
            <Building2 className="w-5 h-5 text-muted mx-auto mb-2" />
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-[11px] text-muted mt-0.5">{p.title}</p>
            {p.job_description && (
              <p className="text-[10px] text-muted/70 mt-1 line-clamp-2">{p.job_description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
