import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function LearningLogPage() {
  return (
    <div>
      <PageHeader
        title="Learning Log"
        description="Browse technical concepts captured during work sessions."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Concept Browser"
          description="Search and filter logged concepts by category."
          items={[
            'Category-indexed browsing',
            'Full-text search',
            'Session timeline view',
          ]}
        />
        <PlaceholderCard
          title="Knowledge Graph"
          description="Visualize connections between learned concepts."
          items={[
            'Topic clustering',
            'Prerequisite mapping',
            'Progress tracking',
          ]}
        />
      </div>
    </div>
  )
}
