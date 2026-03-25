import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function ACIOPage() {
  return (
    <div>
      <PageHeader
        title="ACIO"
        description="AI-powered tools for the investment process."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Investment Memos"
          description="Draft, review, and manage investment memoranda."
          items={[
            'Memo drafting & templates',
            'Thesis tracking',
            'Approval workflows',
          ]}
        />
      </div>
    </div>
  )
}
