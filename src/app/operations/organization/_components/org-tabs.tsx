'use client'

import { useState } from 'react'
import OrgChart from './org-chart'
import ResponsibilitiesMatrix from './responsibilities-matrix'
import NotionAuditTab from './notion-audit-tab'

const TABS = [
  { key: 'chart', label: 'Org Chart' },
  { key: 'responsibilities', label: 'Responsibilities' },
  { key: 'notion', label: 'Notion Audit' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function OrgTabs() {
  const [active, setActive] = useState<TabKey>('chart')

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-card-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.key
                ? 'text-accent border-accent'
                : 'text-muted border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'chart' && <OrgChart />}
      {active === 'responsibilities' && <ResponsibilitiesMatrix />}
      {active === 'notion' && <NotionAuditTab />}
    </div>
  )
}
