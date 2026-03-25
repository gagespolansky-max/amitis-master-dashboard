import PageHeader from '@/components/page-header'

export default function FundReturnsPage() {
  const dashboardUrl = process.env.FUND_RETURNS_URL || 'http://localhost:5050'

  return (
    <div>
      <PageHeader
        title="Fund Returns"
        description="Performance tracking from underlying fund allocations. Powered by your existing Fund Returns Dashboard."
        status="in-progress"
      />

      <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <p className="text-xs text-muted">
            Connected to Fund Returns Dashboard
          </p>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Open in new tab
          </a>
        </div>
        <iframe
          src={dashboardUrl}
          className="w-full border-0"
          style={{ height: 'calc(100vh - 220px)' }}
          title="Fund Returns Dashboard"
        />
      </div>
    </div>
  )
}
