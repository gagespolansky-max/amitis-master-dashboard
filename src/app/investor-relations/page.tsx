import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function InvestorRelationsPage() {
  return (
    <div>
      <PageHeader
        title="Investor Relations"
        description="Managing communications, reporting, and LP-facing materials."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="One Pagers"
          description="Generate and update investor-facing single-page fund summaries."
          items={[
            'Template design',
            'Data integration',
            'PDF generation',
          ]}
        />
        <PlaceholderCard
          title="Market Newsletters"
          description="Produce regular market commentary and updates."
          items={[
            'Content generation',
            'Distribution list management',
            'Template formatting',
          ]}
        />
      </div>
    </div>
  )
}
