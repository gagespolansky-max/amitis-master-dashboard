import PageHeader from '@/components/page-header'
import CollateralsGrid from './_components/collaterals-grid'

export default function MarketingCollateralsPage() {
  return (
    <div>
      <PageHeader
        title="Marketing Collaterals"
        description="Investor-facing decks, backtests, risk reports, and fund overviews — pulled live from Dropbox."
        status="active"
      />
      <CollateralsGrid />
    </div>
  )
}
