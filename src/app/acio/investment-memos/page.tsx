import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function InvestmentMemosPage() {
  return (
    <div>
      <PageHeader
        title="Investment Memos"
        description="Draft, review, and manage investment memoranda."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Memo Drafting"
          description="AI-assisted investment memo creation."
          items={[
            'Structured memo templates',
            'Thesis generation',
            'Risk factor analysis',
          ]}
        />
        <PlaceholderCard
          title="Memo Library"
          description="Search and reference past investment memos."
          items={[
            'Full-text search',
            'Tag & categorize',
            'Version history',
          ]}
        />
      </div>
    </div>
  )
}
