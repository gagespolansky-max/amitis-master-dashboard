import { createServerClient } from '@/lib/supabase-server'
import PageHeader from '@/components/page-header'
import ReturnsTable from './_components/returns-table'
import type { FundReturn } from './_lib/types'

export default async function FundReturnsPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('fund_returns')
    .select('*')
    .order('return_month', { ascending: false })
    .order('fund_name', { ascending: true })

  const returns: FundReturn[] = data || []

  return (
    <div>
      <PageHeader
        title="Fund Returns"
        description="Automated daily extraction from Gmail. Review and verify."
        status="active"
      />
      <div className="mt-6">
        <ReturnsTable initialData={returns} />
      </div>
    </div>
  )
}
