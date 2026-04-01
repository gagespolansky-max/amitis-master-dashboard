import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function NewslettersPage() {
  return (
    <div>
      <PageHeader
        title="Market Newsletters"
        description="Produce regular market commentary and performance updates for LPs."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Content Generation"
          description="AI-assisted market commentary drafting."
          items={[
            'Market narrative generation',
            'Performance highlights',
            'Portfolio commentary',
          ]}
        />
        <PlaceholderCard
          title="Distribution"
          description="Newsletter formatting and delivery via Mailchimp."
          items={[
            'Template formatting',
            'Distribution list management',
            'Send scheduling',
          ]}
        />
      </div>
    </div>
  )
}
