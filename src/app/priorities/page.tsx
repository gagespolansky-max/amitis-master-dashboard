import PageHeader from '@/components/page-header'
import PriorityBoard from './_components/priority-board'

export default function PrioritiesPage() {
  return (
    <div>
      <PageHeader
        title="Priorities"
        description="AI-ranked from your email and Attio. Drag to reorder. Refreshes every 4 hours."
        status="active"
      />
      <PriorityBoard />
    </div>
  )
}
