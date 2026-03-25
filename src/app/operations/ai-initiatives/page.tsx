import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function AIInitiativesPage() {
  return (
    <div>
      <PageHeader
        title="AI Initiatives"
        description="Tracking and building internal AI tools, automations, and system improvements."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Active initiatives"
          description="AI tools and automations currently in progress."
          items={[
            'Fund Returns Dashboard (Gmail → PDF → Notion)',
            'Master Dashboard (this)',
            'Enablement Coach skill',
          ]}
        />
        <PlaceholderCard
          title="Pipeline"
          description="Ideas and planned initiatives."
          items={[
            'One-pager generation',
            'Market newsletter automation',
            'Research workflow tooling',
          ]}
        />
      </div>
    </div>
  )
}
