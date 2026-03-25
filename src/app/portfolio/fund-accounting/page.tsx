import PageHeader from '@/components/page-header'
import PlaceholderCard from '@/components/placeholder-card'

export default function FundAccountingPage() {
  return (
    <div>
      <PageHeader
        title="Fund Accounting"
        description="End-to-end fund accounting and NAV tracking."
        status="coming-soon"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlaceholderCard
          title="What this will include"
          description="Still scoping — need to figure out the right structure."
          items={[
            'NAV reconciliation',
            'Capital calls & distributions',
            'Fee calculations',
            'LP allocations',
          ]}
        />
        <PlaceholderCard
          title="Open questions"
          description="Decisions to make before building."
          items={[
            'Data source — Excel, Notion, or database?',
            'Frequency — monthly, quarterly?',
            'What reports does this need to generate?',
          ]}
        />
      </div>
    </div>
  )
}
