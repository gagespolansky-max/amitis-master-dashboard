'use client'

import { useEffect, useState } from 'react'

interface FundConfig {
  id: string
  name: string
  format: string
  share_class: string
  sender: string
}

const FORMAT_LABELS: Record<string, string> = {
  pdf_attachment: 'PDF',
  email_body: 'Email',
  web_portal: 'Web',
  custom: 'Custom',
}

export default function FundStatusBar({ dashboardUrl }: { dashboardUrl: string }) {
  const [funds, setFunds] = useState<FundConfig[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${dashboardUrl}/api/fund-configs`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setFunds)
      .catch(() => setError(true))
  }, [dashboardUrl])

  if (error || funds.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 mb-3 rounded-lg border border-card-border bg-card-bg overflow-x-auto">
      <span className="text-xs text-muted whitespace-nowrap">
        {funds.length} funds configured
      </span>
      <div className="w-px h-4 bg-card-border" />
      {funds.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface text-xs text-secondary whitespace-nowrap"
        >
          {f.name}
          <span className="text-[10px] px-1 py-px rounded bg-card-border text-muted">
            {FORMAT_LABELS[f.format] || f.format}
          </span>
        </span>
      ))}
    </div>
  )
}
