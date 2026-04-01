import PageHeader from '@/components/page-header'
import ACIOBoard from './_components/ACIOBoard'

export default function DealsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <PageHeader
        title="Deal Pipeline"
        description="Deal flow tracker — investment opportunities sourced from Gmail."
        status="in-progress"
      />

      <div className="flex-1 rounded-xl border border-card-border bg-card-bg overflow-hidden">
        <ACIOBoard />
      </div>
    </div>
  )
}
