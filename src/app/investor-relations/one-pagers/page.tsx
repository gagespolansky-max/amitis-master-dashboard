import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function OnePagersPage() {
  return (
    <div>
      <PageHeader
        title="One Pagers"
        description="Generate and update investor-facing single-page fund summaries."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Template Design"
          description="Configurable one-pager templates with performance data."
          items={[
            'Fund overview layout',
            'Performance charts',
            'Risk statistics integration',
          ]}
        />
        <PlaceholderCard
          title="PDF Generation"
          description="Automated PDF export from live data."
          items={[
            'Pipeline 1 data integration',
            'Branded formatting',
            'Batch generation',
          ]}
        />
      </div>
    </div>
  )
}
