import { createServerClient } from '@/lib/supabase-server'
import PageHeader from '@/components/page-header'
import ReturnsTable from './_components/returns-table'
import DocumentUploadPanel from '@/components/document-upload-panel'
import type { FundReturn } from './_lib/types'

export default async function FundReturnsPage() {
  const supabase = createServerClient()
  const { data } = await supabase.from('fund_returns').select('*')
  const returns: FundReturn[] = data || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund Returns"
        description="Review extracted returns and upload supporting documents like statements or reports."
        status="active"
      />

      <DocumentUploadPanel workstream="Portfolio" />

      <ReturnsTable initialData={returns} />
    </div>
  )
}
