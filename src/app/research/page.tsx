import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function ResearchPage() {
  return (
    <div>
      <PageHeader
        title="Research"
        description="Investment research workflows, fund vetting, and deal evaluation."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="Fund Vetting"
          description="Evaluate new fund opportunities and track pipeline."
          items={[
            'Manager screening',
            'Due diligence checklists',
            'Performance analysis',
          ]}
        />
        <PlaceholderCard
          title="Deal Evaluation"
          description="Private deal evaluation and tracking."
          items={[
            'Deal memo templates',
            'Return modeling',
            'Pipeline tracking',
          ]}
        />
      </div>
    </div>
  )
}
