import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function XPostsPage() {
  return (
    <div>
      <PageHeader
        title="X Posts"
        description="Schedule and manage social media content for X (Twitter)."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Content Drafting"
          description="Draft posts from market commentary and newsletter content."
          items={[
            'AI-assisted copy',
            'Thread formatting',
            'Hashtag suggestions',
          ]}
        />
        <PlaceholderCard
          title="Scheduling"
          description="Queue and schedule posts for optimal timing."
          items={[
            'Calendar view',
            'Optimal send times',
            'Approval workflow',
          ]}
        />
      </div>
    </div>
  )
}
