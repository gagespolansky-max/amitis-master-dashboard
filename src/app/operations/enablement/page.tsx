import fs from 'fs'
import path from 'path'
import PageHeader from '@/components/page-header'
import EnablementTabs from './_components/enablement-tabs'

interface Suggestion {
  date: string
  type: string
  title: string
  description: string
  status: string
}

interface WeeklyReport {
  week: string
  suggestions: Suggestion[]
}

function getReports(): WeeklyReport[] {
  const reportsPath = path.join(process.cwd(), 'data', 'weekly-reports.json')
  try {
    const data = fs.readFileSync(reportsPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function getPendingSuggestions(): Suggestion[] {
  const suggestionsPath = path.join(process.cwd(), 'data', 'suggestions.json')
  try {
    const data = fs.readFileSync(suggestionsPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export const dynamic = 'force-dynamic'

export default function EnablementPage() {
  const reports = getReports()
  const pending = getPendingSuggestions()

  return (
    <div>
      <PageHeader
        title="Enablement"
        description="Level up how you use Claude Code and your tools."
        status="in-progress"
      />
      <EnablementTabs pending={pending} reports={reports} />
    </div>
  )
}
