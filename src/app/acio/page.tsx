import PageHeader from '@/components/page-header'
import ACIOBoard from '@/components/acio/ACIOBoard'

export default function ACIOPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <PageHeader
        title="ACIO"
        description="Deal flow tracker — investment opportunities sourced from Gmail."
        status="in-progress"
      />

      <div className="flex-1 rounded-xl border border-card-border bg-card-bg overflow-hidden">
        <ACIOBoard />
      </div>
    </div>
  )
}
